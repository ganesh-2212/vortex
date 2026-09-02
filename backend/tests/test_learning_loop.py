import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest

from app.store import MemoryStore, store
from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
    RiskLevel
)
from app.services.strategy_optimizer import optimize_strategy
from app.services.outcomes import confirm_payment_recovery

def test_learning_loop_end_to_end():
    store.clear()
    
    # 1. Setup a merchant and customer
    m_id = uuid.uuid4()
    c_id = uuid.uuid4()
    
    from app.models.domain import Merchant, Customer, RevenueEvent, RevenueEventType
    store.merchants[m_id] = Merchant(
        id=m_id, name="Test", email="test@test.com", recovery_enabled=True,
        supported_recovery_actions=["RETRY_PAYMENT", "ALTERNATE_PAYMENT"]
    )
    store.customers[c_id] = Customer(id=c_id, merchant_id=m_id, name="Cust", email="c@test.com", phone="123")
    
    now = datetime.now(timezone.utc)
    
    # Create 5 identical cases that succeeded on IMMEDIATE_RETRY to build historical data
    # We will simulate 5 immediate retry attempts that were executed, and the case was recovered.
    for i in range(5):
        case_id = uuid.uuid4()
        event_id = uuid.uuid4()
        act_id = uuid.uuid4()
        
        store.revenue_events[event_id] = RevenueEvent(
            id=event_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.PAYMENT_FAILED,
            amount=Decimal("1000.00"), currency="INR", status="FAILED", occurred_at=now
        )
        case = RecoveryCase(
            id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=event_id,
            amount_at_risk=Decimal("1000.00"), risk_level=RiskLevel.MEDIUM, risk_reason="Test",
            status=RecoveryCaseStatus.IN_PROGRESS, created_at=now, updated_at=now
        )
        store.recovery_cases[case_id] = case
        
        # Immediate retry
        store.recovery_actions[act_id] = RecoveryAction(
            id=act_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
            attempt_number=1, status=RecoveryActionStatus.EXECUTED, created_at=now
        )
        
        # Confirm payment recovery, which triggers the learning update!
        # Pass a fake transaction ID
        confirm_payment_recovery(case, f"txn_{i}", Decimal("1000.00"), now)
        
    # Check that audit log has STRATEGY_PERFORMANCE_UPDATED
    learning_logs = [log for log in store.audit_logs if log.action == "STRATEGY_PERFORMANCE_UPDATED"]
    assert len(learning_logs) > 0
    last_log = learning_logs[-1]
    assert last_log.details["strategy"] == "IMMEDIATE_RETRY"
    assert last_log.details["updated_successes"] == 5
    assert last_log.details["updated_attempts"] == 5
    assert last_log.details["updated_recovery_rate"] == 100.0

    # Test idempotency - duplicate confirm_payment_recovery on the same case
    previous_log_count = len(store.audit_logs)
    case_to_duplicate = store.recovery_cases[list(store.recovery_cases.keys())[0]]
    was_recovered = confirm_payment_recovery(case_to_duplicate, "txn_duplicate", Decimal("1000.00"), now)
    
    assert not was_recovered # Idempotent check
    assert len(store.audit_logs) == previous_log_count # NO additional audit logs
    
    # 2. Now evaluate a NEW case with the optimizer
    new_case_id = uuid.uuid4()
    new_event_id = uuid.uuid4()
    store.revenue_events[new_event_id] = RevenueEvent(
        id=new_event_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("1000.00"), currency="INR", status="FAILED", occurred_at=now
    )
    new_case = RecoveryCase(
        id=new_case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=new_event_id,
        amount_at_risk=Decimal("1000.00"), risk_level=RiskLevel.MEDIUM, risk_reason="Test",
        status=RecoveryCaseStatus.OPEN, created_at=now, updated_at=now
    )
    store.recovery_cases[new_case_id] = new_case
    
    # Optimize
    res = optimize_strategy(store, new_case, now)
    
    # Because of our 5 previous 100% successes, the strategy optimizer should see empirical probability = 100
    # for IMMEDIATE_RETRY. Let's find it in the strategies array.
    immediate_retry_opt = next((s for s in res.strategies if s.strategy_name == "IMMEDIATE_RETRY"), None)
    assert immediate_retry_opt is not None
    assert immediate_retry_opt.recovery_probability == 100
    
    # The reason string must contain the empirical proof
    reason_str = " ".join(immediate_retry_opt.reasons)
    assert "Strategy performance updated from recovery outcome" in reason_str
    assert "100.0% success rate" in reason_str
    
    # The recommendation is influenced
    assert res.recommended_strategy == "IMMEDIATE_RETRY"


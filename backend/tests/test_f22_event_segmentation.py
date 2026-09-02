import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.store import MemoryStore, store
from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
    RiskLevel,
    RevenueEvent,
    RevenueEventType,
    Merchant,
    Customer
)
from app.services.strategy_performance import get_strategy_performance_by_event, get_strategy_performance
from app.services.outcomes import confirm_payment_recovery

def test_event_segmentation_isolation():
    store.clear()
    
    m_id = uuid.uuid4()
    c_id = uuid.uuid4()
    store.merchants[m_id] = Merchant(
        id=m_id, name="Test", email="test@test.com", recovery_enabled=True,
        supported_recovery_actions=["RETRY_PAYMENT", "ALTERNATE_PAYMENT"]
    )
    store.customers[c_id] = Customer(id=c_id, merchant_id=m_id, name="Cust", email="c@test.com", phone="123")
    
    now = datetime.now(timezone.utc)
    
    def simulate_cases(event_type: RevenueEventType, attempts: int, successes: int):
        for i in range(attempts):
            case_id = uuid.uuid4()
            event_id = uuid.uuid4()
            act_id = uuid.uuid4()
            
            store.revenue_events[event_id] = RevenueEvent(
                id=event_id, merchant_id=m_id, customer_id=c_id, event_type=event_type,
                amount=Decimal("100.00"), currency="USD", status="FAILED", occurred_at=now
            )
            case = RecoveryCase(
                id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=event_id,
                amount_at_risk=Decimal("100.00"), risk_level=RiskLevel.MEDIUM, risk_reason="Test",
                status=RecoveryCaseStatus.IN_PROGRESS, created_at=now, updated_at=now
            )
            store.recovery_cases[case_id] = case
            
            store.recovery_actions[act_id] = RecoveryAction(
                id=act_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
                attempt_number=1, status=RecoveryActionStatus.EXECUTED, created_at=now
            )
            
            if i < successes:
                confirm_payment_recovery(case, f"txn_{event_type.value}_{i}", Decimal("100.00"), now)
            else:
                case.status = RecoveryCaseStatus.STOPPED
                
    # Fixtures
    simulate_cases(RevenueEventType.PAYMENT_FAILED, 5, 4)
    simulate_cases(RevenueEventType.INVOICE_OVERDUE, 5, 2)
    simulate_cases(RevenueEventType.SUBSCRIPTION_FAILED, 5, 4)
    
    # 1. Global statistics still contain all applicable outcomes.
    global_perf = get_strategy_performance(store)
    imm_retry_global = next((s for s in global_perf.strategy_statistics if s.strategy_type == "IMMEDIATE_RETRY"), None)
    assert imm_retry_global is not None
    assert imm_retry_global.total_attempts == 15
    assert imm_retry_global.successful_attempts == 10
    
    # 2. Event-specific statistics
    event_perf_list = get_strategy_performance_by_event(store)
    assert len(event_perf_list) == 3
    
    pf = next(e for e in event_perf_list if e.event_type == RevenueEventType.PAYMENT_FAILED.value)
    pf_strat = next(s for s in pf.strategy_breakdown if s.strategy_type == "IMMEDIATE_RETRY")
    assert pf_strat.total_attempts == 5
    assert pf_strat.successful_attempts == 4
    assert pf_strat.success_rate == 80.0
    assert pf.best_strategy == "IMMEDIATE_RETRY"
    
    io = next(e for e in event_perf_list if e.event_type == RevenueEventType.INVOICE_OVERDUE.value)
    io_strat = next(s for s in io.strategy_breakdown if s.strategy_type == "IMMEDIATE_RETRY")
    assert io_strat.total_attempts == 5
    assert io_strat.successful_attempts == 2
    assert io_strat.success_rate == 40.0
    
    sf = next(e for e in event_perf_list if e.event_type == RevenueEventType.SUBSCRIPTION_FAILED.value)
    sf_strat = next(s for s in sf.strategy_breakdown if s.strategy_type == "IMMEDIATE_RETRY")
    assert sf_strat.total_attempts == 5
    assert sf_strat.successful_attempts == 4
    assert sf_strat.success_rate == 80.0
    
    # 3. Empty event segments
    # Let's add an event type with NO historical outcomes (e.g. CHECKOUT_ABANDONED)
    # We just create a case with NO actions.
    case_id = uuid.uuid4()
    event_id = uuid.uuid4()
    store.revenue_events[event_id] = RevenueEvent(
        id=event_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.CHECKOUT_ABANDONED,
        amount=Decimal("100.00"), currency="USD", status="FAILED", occurred_at=now
    )
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=event_id,
        amount_at_risk=Decimal("100.00"), risk_level=RiskLevel.MEDIUM, risk_reason="Test",
        status=RecoveryCaseStatus.OPEN, created_at=now, updated_at=now
    )
    
    event_perf_list = get_strategy_performance_by_event(store)
    rf = next(e for e in event_perf_list if e.event_type == RevenueEventType.CHECKOUT_ABANDONED.value)
    rf_strat = next(s for s in rf.strategy_breakdown if s.strategy_type == "IMMEDIATE_RETRY")
    
    assert rf_strat.total_attempts == 0
    assert rf_strat.successful_attempts == 0
    assert rf.best_strategy == "NO_INTERVENTION"

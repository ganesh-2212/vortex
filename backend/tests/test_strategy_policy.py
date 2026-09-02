import pytest
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.models.domain import (
    Merchant, Customer, RevenueEvent, RecoveryCase,
    RevenueEventType, RiskLevel, RecoveryCaseStatus,
    RecoveryActionType, RecoveryAction, RecoveryActionStatus
)
from app.store import MemoryStore
from app.services.strategy_optimizer import optimize_strategy
from app.services.recovery_orchestrator import evaluate_orchestration

@pytest.fixture
def clean_store():
    from app.store import store
    store.clear()
    m_id = uuid.uuid4()
    c_id = uuid.uuid4()
    store.merchants[m_id] = Merchant(
        id=m_id,
        name="Test Merchant",
        email="test@merchant.com",
        recovery_enabled=True,
        max_retry_attempts=3,
        retry_cooldown_hours=24,
        supported_recovery_actions=["RETRY_PAYMENT", "ESCALATE_TO_HUMAN", "STOP_RECOVERY", "SEND_REMINDER"]
    )
    store.customers[c_id] = Customer(
        id=c_id,
        merchant_id=m_id,
        name="Test Customer",
        email="test@customer.com",
        phone="+910000000000"
    )
    return store, m_id, c_id

def _create_case(store, m_id, c_id, amount, risk_level, status=RecoveryCaseStatus.OPEN, age_hours=2):
    now = datetime.now(timezone.utc)
    event_time = now - timedelta(hours=age_hours)
    
    event_id = uuid.uuid4()
    store.revenue_events[event_id] = RevenueEvent(
        id=event_id,
        merchant_id=m_id,
        customer_id=c_id,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal(amount),
        currency="INR",
        status="FAILED",
        occurred_at=event_time
    )
    
    case_id = uuid.uuid4()
    case = RecoveryCase(
        id=case_id,
        merchant_id=m_id,
        customer_id=c_id,
        revenue_event_id=event_id,
        amount_at_risk=Decimal(amount),
        risk_level=risk_level,
        risk_reason="Test Risk",
        status=status,
        created_at=event_time,
        updated_at=now
    )
    store.recovery_cases[case_id] = case
    return case_id

def test_eligible_failed_payment_recommends_retry(clean_store):
    store, m_id, c_id = clean_store
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM)
    
    now = datetime.now(timezone.utc)
    res = evaluate_orchestration(case_id, store, now)
    assert res.decision.value == "EXECUTE_NOW"
    assert res.next_action == RecoveryActionType.RETRY_PAYMENT
    assert res.selected_strategy == "IMMEDIATE_RETRY"
    assert res.human_escalation_required == False

def test_already_recovered_case_blocked(clean_store):
    store, m_id, c_id = clean_store
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM, RecoveryCaseStatus.RECOVERED)
    
    now = datetime.now(timezone.utc)
    res = evaluate_orchestration(case_id, store, now)
    assert res.decision.value == "ALREADY_RECOVERED"

def test_stopped_case_blocked(clean_store):
    store, m_id, c_id = clean_store
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM, RecoveryCaseStatus.STOPPED)
    
    now = datetime.now(timezone.utc)
    res = evaluate_orchestration(case_id, store, now)
    assert res.decision.value == "STOP_RECOVERY"
    
def test_retry_limit_exceeded_escalates(clean_store):
    store, m_id, c_id = clean_store
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM)
    
    now = datetime.now(timezone.utc)
    # Add 3 failed attempts
    for i in range(3):
        store.recovery_actions[uuid.uuid4()] = RecoveryAction(
            id=uuid.uuid4(),
            recovery_case_id=case_id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.EXECUTED,
            created_at=now - timedelta(hours=50 - i)
        )
        
    res = evaluate_orchestration(case_id, store, now)
    assert res.decision.value == "ESCALATE_TO_HUMAN"
    assert res.human_escalation_required == True

def test_active_cooldown_delays_retry(clean_store):
    store, m_id, c_id = clean_store
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM)
    
    now = datetime.now(timezone.utc)
    # Add 1 recent failed attempt
    store.recovery_actions[uuid.uuid4()] = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case_id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED,
        created_at=now - timedelta(hours=1)
    )
        
    res = evaluate_orchestration(case_id, store, now)
    assert res.decision.value == "WAIT_COOLDOWN"
    assert res.cooldown_active == True
    assert res.next_action == RecoveryActionType.RETRY_PAYMENT

def test_global_recovery_disabled_blocks_retry(clean_store):
    store, m_id, c_id = clean_store
    store.merchants[m_id].recovery_enabled = False
    
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM)
    now = datetime.now(timezone.utc)
    
    res = evaluate_orchestration(case_id, store, now)
    # Strategy Optimizer will return "NO_INTERVENTION" because RETRY is blocked by guardrails
    assert res.decision.value == "STOP_RECOVERY"

def test_eligible_critical_value_receives_retry(clean_store):
    store, m_id, c_id = clean_store
    # ₹50,00,000 equivalent
    case_id = _create_case(store, m_id, c_id, "5000000.00", RiskLevel.CRITICAL)
    now = datetime.now(timezone.utc)
    
    res = evaluate_orchestration(case_id, store, now)
    # Critical risk high value should STILL get retry because of policy decoupling
    assert res.decision.value == "EXECUTE_NOW"
    assert res.next_action == RecoveryActionType.RETRY_PAYMENT

def test_genuine_human_escalation(clean_store):
    store, m_id, c_id = clean_store
    # Configure merchant to ONLY allow escalation
    store.merchants[m_id].supported_recovery_actions = ["ESCALATE_TO_HUMAN", "STOP_RECOVERY"]
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM)
    now = datetime.now(timezone.utc)
    
    res = evaluate_orchestration(case_id, store, now)
    # Because retry is removed from supported actions, escalation is the only logical choice
    assert res.decision.value == "ESCALATE_TO_HUMAN"

def test_orchestration_reason_matches_selected_strategy(clean_store):
    store, m_id, c_id = clean_store
    case_id = _create_case(store, m_id, c_id, "1000.00", RiskLevel.MEDIUM)
    
    now = datetime.now(timezone.utc)
    res = evaluate_orchestration(case_id, store, now)
    assert res.selected_strategy == "IMMEDIATE_RETRY"
    assert "Strategy optimizer recommends immediate retry" in res.reason

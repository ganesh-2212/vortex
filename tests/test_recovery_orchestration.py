import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import (
    Merchant,
    Customer,
    RevenueEvent,
    RevenueEventType,
    RecoveryCase,
    RecoveryCaseStatus,
    RiskLevel,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
    OrchestrationDecisionType
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown():
    store.clear()
    yield
    store.clear()

def seed_test_data() -> uuid.UUID:
    m_id = uuid.uuid4()
    c_id = uuid.uuid4()
    e_id = uuid.uuid4()
    case_id = uuid.uuid4()
    
    store.merchants[m_id] = Merchant(id=m_id, name="Test Merchant", retry_cooldown_hours=24, max_retry_attempts=3)
    store.customers[c_id] = Customer(id=c_id, merchant_id=m_id, name="Test Customer")
    
    dt = datetime.now(timezone.utc)
    
    store.revenue_events[e_id] = RevenueEvent(
        id=e_id, merchant_id=m_id, customer_id=c_id, event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("5000.00"), status="FAILED", occurred_at=dt
    )
    
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id, merchant_id=m_id, customer_id=c_id, revenue_event_id=e_id,
        amount_at_risk=Decimal("5000.00"), risk_level=RiskLevel.MEDIUM, status=RecoveryCaseStatus.OPEN
    )
    
    return case_id

def test_evaluate_first_failed_payment():
    case_id = seed_test_data()
    response = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert response.status_code == 200
    data = response.json()
    
    assert data["case_id"] == str(case_id)
    assert data["decision"] == OrchestrationDecisionType.EXECUTE_NOW
    assert data["selected_strategy"] == "IMMEDIATE_RETRY"
    assert data["next_action"] == "RETRY_PAYMENT"
    assert data["attempt_number"] == 1
    assert data["cooldown_active"] is False

def test_evaluate_cooldown_active():
    case_id = seed_test_data()
    
    # Add a recent retry
    action_id = uuid.uuid4()
    store.recovery_actions[action_id] = RecoveryAction(
        id=action_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.FAILED, attempt_number=1, created_at=datetime.now(timezone.utc)
    )
    
    response = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert response.status_code == 200
    data = response.json()
    
    assert data["decision"] == OrchestrationDecisionType.WAIT_COOLDOWN
    assert data["selected_strategy"] == "DELAYED_RETRY"
    assert data["attempt_number"] == 2
    assert data["cooldown_active"] is True
    assert data["scheduled_time"] is not None

def test_evaluate_cooldown_expired():
    case_id = seed_test_data()
    
    # Add an old retry
    action_id = uuid.uuid4()
    old_time = datetime.now(timezone.utc) - timedelta(hours=25)
    store.recovery_actions[action_id] = RecoveryAction(
        id=action_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.FAILED, attempt_number=1, created_at=old_time
    )
    
    response = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert response.status_code == 200
    data = response.json()
    
    assert data["decision"] == OrchestrationDecisionType.EXECUTE_NOW
    assert data["selected_strategy"] == "IMMEDIATE_RETRY"
    assert data["attempt_number"] == 2
    assert data["cooldown_active"] is False

def test_maximum_attempts_reached():
    case_id = seed_test_data()
    
    for i in range(3):
        a_id = uuid.uuid4()
        t = datetime.now(timezone.utc) - timedelta(hours=30 - i)
        store.recovery_actions[a_id] = RecoveryAction(
            id=a_id, recovery_case_id=case_id, action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.FAILED, attempt_number=i+1, created_at=t
        )
        
    response = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert response.status_code == 200
    data = response.json()
    
    assert data["decision"] == OrchestrationDecisionType.ESCALATE_TO_HUMAN
    assert data["attempt_number"] == 4
    assert data["human_escalation_required"] is True

def test_recovered_case():
    case_id = seed_test_data()
    store.recovery_cases[case_id].status = RecoveryCaseStatus.RECOVERED
    
    response = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == OrchestrationDecisionType.ALREADY_RECOVERED

def test_stopped_case():
    case_id = seed_test_data()
    store.recovery_cases[case_id].status = RecoveryCaseStatus.STOPPED
    
    response = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == OrchestrationDecisionType.STOP_RECOVERY

def test_idempotency_audit_logs():
    case_id = seed_test_data()
    
    r1 = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    r2 = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    r3 = client.get(f"/api/v1/recovery-cases/{case_id}/orchestration")
    
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 200
    
    # Should only log ONCE
    logs = [log for log in store.audit_logs if log.recovery_case_id == case_id and log.action.startswith("ORCHESTRATION_")]
    assert len(logs) == 1

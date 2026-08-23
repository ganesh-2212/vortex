import pytest
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
from fastapi.testclient import TestClient

from app.main import app
from app.store import store, seed_store
from app.models.domain import (
    RevenueEventType, RiskLevel, RecoveryCaseStatus,
    RecoveryActionType, RecoveryActionStatus, RecoveryAction
)
from app.services.risk_engine import assess_risk, RiskResult
from app.services.guardrails import evaluate_guardrails, GuardrailResult

client = TestClient(app)

# Constants for testing
MERCHANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
CUSTOMER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

@pytest.fixture(autouse=True)
def clean_store():
    """Clears the store database before each test run."""
    store.clear()
    yield

@pytest.fixture
def seeded_db():
    """Seeds the store with the default merchant and customer for testing."""
    seed_store(store)
    return store

# --- 1. Risk Engine Unit Tests ---

def test_risk_engine_low_risk(seeded_db):
    # Very small amount (< 100) + first failure (failures count = 0)
    from app.models.domain import RevenueEvent
    
    event = RevenueEvent(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("50.00"),
        status="FAILED",
        occurred_at=datetime.utcnow()
    )
    result = assess_risk(event, existing_failures_count=0)
    assert result.risk_level == RiskLevel.LOW
    assert "signals" in result.model_dump()
    assert result.signals["amount"] == Decimal("50.00")
    assert result.signals["failure_count"] == 0

def test_risk_engine_high_risk_by_amount(seeded_db):
    from app.models.domain import RevenueEvent
    event = RevenueEvent(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("15000.00"),
        status="FAILED",
        occurred_at=datetime.utcnow()
    )
    result = assess_risk(event, existing_failures_count=0)
    assert result.risk_level == RiskLevel.HIGH
    assert "High-value" in result.reason

def test_risk_engine_high_risk_by_repeated_failures(seeded_db):
    from app.models.domain import RevenueEvent
    event = RevenueEvent(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("500.00"),
        status="FAILED",
        occurred_at=datetime.utcnow()
    )
    result = assess_risk(event, existing_failures_count=2)
    assert result.risk_level == RiskLevel.HIGH
    assert "Repeated" in result.reason

def test_risk_engine_critical_risk_by_value(seeded_db):
    from app.models.domain import RevenueEvent
    event = RevenueEvent(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("55000.00"),
        status="FAILED",
        occurred_at=datetime.utcnow()
    )
    result = assess_risk(event, existing_failures_count=0)
    assert result.risk_level == RiskLevel.CRITICAL

def test_risk_engine_critical_risk_by_overdue(seeded_db):
    from app.models.domain import RevenueEvent
    event = RevenueEvent(
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        event_type=RevenueEventType.INVOICE_OVERDUE,
        amount=Decimal("12000.00"),
        status="OVERDUE",
        occurred_at=datetime.utcnow()
    )
    result = assess_risk(event, existing_failures_count=0)
    assert result.risk_level == RiskLevel.CRITICAL
    assert result.signals["overdue_status"] is True

# --- 2. API & Guardrail Integration Tests ---

def test_post_revenue_event_creates_case(seeded_db):
    # Post a failure event to create a recovery case
    response = client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    assert response.status_code == 200
    
    # Verify case is created
    assert len(seeded_db.recovery_cases) == 1
    case = list(seeded_db.recovery_cases.values())[0]
    assert case.status == RecoveryCaseStatus.OPEN
    assert case.amount_at_risk == Decimal("1000.00")

def test_retry_action_allowed_under_limit(seeded_db):
    # Trigger a case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]

    # Propose first retry attempt
    response = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "RETRY_PAYMENT",
        "reason": "First automated retry"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALLOWED"
    assert "Retry attempt 1" in data["reason"]

def test_retry_action_blocked_after_maximum_attempts(seeded_db):
    # Trigger a case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]

    # Inject 3 allowed attempts in the store (spaced by > 24 hours to avoid cooldown blocks)
    now = datetime.utcnow()
    for i in range(1, 4):
        action_id = uuid.uuid4()
        seeded_db.recovery_actions[action_id] = RecoveryAction(
            id=action_id,
            recovery_case_id=case_id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.ALLOWED,
            attempt_number=i,
            created_at=now - timedelta(days=4 - i)
        )

    # Propose 4th attempt
    response = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "RETRY_PAYMENT",
        "reason": "Fourth retry proposal"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert "Maximum retry attempts reached" in data["reason"]

def test_retry_cooldown_allowed_after_24_hours(seeded_db):
    # Trigger case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]

    # Inject previous retry action created 25 hours ago
    action_id = uuid.uuid4()
    seeded_db.recovery_actions[action_id] = RecoveryAction(
        id=action_id,
        recovery_case_id=case_id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=1,
        created_at=datetime.utcnow() - timedelta(hours=25)
    )

    # Propose retry
    response = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "RETRY_PAYMENT"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALLOWED"

def test_retry_cooldown_blocked_under_24_hours(seeded_db):
    # Trigger case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]

    # Inject previous retry action created 5 hours ago
    action_id = uuid.uuid4()
    seeded_db.recovery_actions[action_id] = RecoveryAction(
        id=action_id,
        recovery_case_id=case_id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=1,
        created_at=datetime.utcnow() - timedelta(hours=5)
    )

    # Propose retry
    response = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "RETRY_PAYMENT"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert "Cooldown active" in data["reason"]

def test_action_blocked_when_case_is_recovered(seeded_db):
    # Trigger case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]
    
    # Mark case as RECOVERED manually
    seeded_db.recovery_cases[case_id].status = RecoveryCaseStatus.RECOVERED

    # Propose action
    response = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "SEND_PAYMENT_LINK"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert "already RECOVERED" in data["reason"]

def test_escalation_allowed(seeded_db):
    # Trigger case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]

    # Propose escalation
    response = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "ESCALATE_TO_HUMAN"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALLOWED"

    # Verify status in case is updated to ESCALATED
    assert seeded_db.recovery_cases[case_id].status == RecoveryCaseStatus.ESCALATED

def test_audit_logs_generated_for_actions(seeded_db):
    # Trigger case
    client.post("/api/v1/revenue-events", json={
        "merchant_id": str(MERCHANT_ID),
        "customer_id": str(CUSTOMER_ID),
        "event_type": "PAYMENT_FAILED",
        "amount": "1000.00",
        "status": "FAILED",
        "occurred_at": datetime.utcnow().isoformat()
    })
    case_id = list(seeded_db.recovery_cases.keys())[0]

    # Clear logs to check new logs
    seeded_db.audit_logs.clear()

    # Propose action that gets allowed
    client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "SEND_REMINDER"
    })

    # Propose action that gets blocked (retry inside cooldown)
    action_id = uuid.uuid4()
    seeded_db.recovery_actions[action_id] = RecoveryAction(
        id=action_id,
        recovery_case_id=case_id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.ALLOWED,
        attempt_number=1,
        created_at=datetime.utcnow()
    )
    client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={
        "action_type": "RETRY_PAYMENT"
    })

    # Filter audit logs for case
    case_logs = [log for log in seeded_db.audit_logs if log.recovery_case_id == case_id]
    
    # We should have ACTION_PROPOSED and ACTION_ALLOWED for reminder
    # and ACTION_PROPOSED and ACTION_BLOCKED for retry
    actions = [log.action for log in case_logs]
    assert "ACTION_PROPOSED" in actions
    assert "ACTION_ALLOWED" in actions
    assert "ACTION_BLOCKED" in actions

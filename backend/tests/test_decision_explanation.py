import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.models.domain import (
    RevenueEvent,
    RevenueEventType,
    RecoveryCase,
    RecoveryCaseStatus,
    RiskLevel,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus
)
from app.store import MemoryStore, store
from app.main import app

client = TestClient(app)

@pytest.fixture
def clean_store():
    store.merchants.clear()
    store.revenue_events.clear()
    store.recovery_cases.clear()
    store.recovery_actions.clear()
    store.audit_logs.clear()
    if hasattr(store, "recovery_lifecycles"):
        store.recovery_lifecycles.clear()
    if hasattr(store, "simulations"):
        store.simulations.clear()
    yield store

def test_get_decision_explanation_success(clean_store):
    merchant_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    class MockMerchant:
        recovery_enabled = True
        max_retry_attempts = 3
        retry_cooldown_hours = 24
        supported_recovery_actions = ["RETRY_PAYMENT", "ESCALATE_TO_HUMAN"]

    clean_store.merchants[merchant_id] = MockMerchant()
    
    event_id = uuid.uuid4()
    event = RevenueEvent(
        id=event_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        amount=Decimal("5000.00"),
        event_type=RevenueEventType.PAYMENT_FAILED,
        status="FAILED",
        occurred_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    clean_store.revenue_events[event_id] = event
    
    case_id = uuid.uuid4()
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        revenue_event_id=event_id,
        amount_at_risk=event.amount,
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    clean_store.recovery_cases[case_id] = case

    # Add an action
    action = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case_id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.FAILED,
        created_at=datetime.now(timezone.utc)
    )
    clean_store.recovery_actions[action.id] = action

    # GET Explanation
    response = client.get(f"/api/v1/recovery-cases/{case_id}/explanation")
    assert response.status_code == 200
    
    data = response.json()
    assert data["case_id"] == str(case_id)
    assert data["risk_level"] == "MEDIUM"
    
    # Check guardrails
    assert data["guardrail_status"] in ("ALLOWED", "BLOCKED")
    
    # Check timeline
    timeline = data["timeline"]
    assert len(timeline) >= 2

def test_get_decision_explanation_guardrail_blocked(clean_store):
    merchant_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    class MockMerchantBlocked:
        recovery_enabled = False
        max_retry_attempts = 3
        retry_cooldown_hours = 24
        supported_recovery_actions = ["RETRY_PAYMENT", "ESCALATE_TO_HUMAN"]

    clean_store.merchants[merchant_id] = MockMerchantBlocked()
    
    event_id = uuid.uuid4()
    event = RevenueEvent(
        id=event_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        amount=Decimal("150.00"),
        event_type=RevenueEventType.PAYMENT_FAILED,
        status="FAILED",
        occurred_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    clean_store.revenue_events[event_id] = event
    
    case_id = uuid.uuid4()
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        revenue_event_id=event_id,
        event_id=event_id,
        amount_at_risk=event.amount,
        risk_level=RiskLevel.LOW,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    clean_store.recovery_cases[case_id] = case

    response = client.get(f"/api/v1/recovery-cases/{case_id}/explanation")
    assert response.status_code == 200
    data = response.json()
    
    # It should be BLOCKED because recovery is disabled
    assert data["guardrail_status"] == "BLOCKED"
    assert len(data["guardrail_checks"]) > 0

def test_get_timeline_endpoint(clean_store):
    merchant_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    event_id = uuid.uuid4()
    event = RevenueEvent(
        id=event_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        amount=Decimal("5000.00"),
        event_type=RevenueEventType.PAYMENT_FAILED,
        status="FAILED",
        occurred_at=datetime.now(timezone.utc)
    )
    clean_store.revenue_events[event_id] = event
    
    case_id = uuid.uuid4()
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        revenue_event_id=event_id,
        event_id=event_id,
        amount_at_risk=event.amount,
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    clean_store.recovery_cases[case_id] = case

    response = client.get(f"/api/v1/recovery-cases/{case_id}/explanation/timeline")
    assert response.status_code == 200

def test_get_guardrails_endpoint(clean_store):
    merchant_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    event_id = uuid.uuid4()
    event = RevenueEvent(
        id=event_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        amount=Decimal("5000.00"),
        event_type=RevenueEventType.PAYMENT_FAILED,
        status="FAILED",
        occurred_at=datetime.now(timezone.utc)
    )
    clean_store.revenue_events[event_id] = event
    
    case_id = uuid.uuid4()
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        revenue_event_id=event_id,
        event_id=event_id,
        amount_at_risk=event.amount,
        risk_level=RiskLevel.HIGH,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc)
    )
    clean_store.recovery_cases[case_id] = case

    response = client.get(f"/api/v1/recovery-cases/{case_id}/explanation/guardrails")
    assert response.status_code == 200

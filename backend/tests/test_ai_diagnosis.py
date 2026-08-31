import uuid
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import RecoveryCase, RevenueEvent, RiskLevel, RevenueEventType

client = TestClient(app)

@pytest.fixture
def setup_diagnosis_case():
    merchant_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    event_id = uuid.uuid4()
    event = RevenueEvent(
        id=event_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("5000.00"),
        currency="INR",
        status="FAILED",
        occurred_at=datetime.now(timezone.utc),
        metadata={
            "error_reason": "international_transaction_not_allowed",
            "method": "card"
        }
    )
    store.revenue_events[event_id] = event
    
    case_id = uuid.uuid4()
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        revenue_event_id=event_id,
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.HIGH
    )
    store.recovery_cases[case_id] = case
    
    yield case_id
    
    del store.recovery_cases[case_id]
    del store.revenue_events[event_id]

def test_ai_diagnosis_international_card(setup_diagnosis_case):
    case_id = setup_diagnosis_case
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    
    data = response.json()
    assert data["root_cause_category"] == "INTERNATIONAL_CARD_RESTRICTION"
    assert "international_transaction_not_allowed" in " ".join(data["evidence"])
    assert data["recommended_action"] == "ALTERNATIVE_PAYMENT_METHOD"
    assert data["confidence"] == 95
    assert data["analysis_source"] == "Deterministic analysis"

def test_ai_diagnosis_insufficient_funds():
    merchant_id = uuid.uuid4()
    event_id = uuid.uuid4()
    store.revenue_events[event_id] = RevenueEvent(
        id=event_id, merchant_id=merchant_id, event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("100.0"), currency="INR", status="FAILED", occurred_at=datetime.now(timezone.utc),
        metadata={"error_reason": "insufficient_funds"}
    )
    case_id = uuid.uuid4()
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id, merchant_id=merchant_id, revenue_event_id=event_id, amount_at_risk=Decimal("100.0"), risk_level=RiskLevel.LOW
    )
    
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    data = response.json()
    assert data["root_cause_category"] == "INSUFFICIENT_FUNDS"
    assert data["recommended_action"] == "RETRY_PAYMENT"
    
def test_ai_diagnosis_unknown():
    merchant_id = uuid.uuid4()
    event_id = uuid.uuid4()
    store.revenue_events[event_id] = RevenueEvent(
        id=event_id, merchant_id=merchant_id, event_type=RevenueEventType.PAYMENT_FAILED,
        amount=Decimal("100.0"), currency="INR", status="FAILED", occurred_at=datetime.now(timezone.utc),
        metadata={}
    )
    case_id = uuid.uuid4()
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id, merchant_id=merchant_id, revenue_event_id=event_id, amount_at_risk=Decimal("100.0"), risk_level=RiskLevel.LOW
    )
    
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    data = response.json()
    assert data["root_cause_category"] == "UNKNOWN_PAYMENT_FAILURE"
    assert data["recommended_action"] == "ESCALATE_TO_HUMAN"
    
def test_ai_diagnosis_not_found():
    response = client.get(f"/api/v1/recovery-cases/{uuid.uuid4()}/diagnosis")
    assert response.status_code == 404

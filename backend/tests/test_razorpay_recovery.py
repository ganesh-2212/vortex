import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import RecoveryCaseStatus, RevenueEventType

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_store():
    store.clear()
    m_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    from app.models.domain import Merchant, RecoveryCase, RiskLevel
    store.merchants[m_id] = Merchant(
        id=m_id,
        name="Acme Corp",
        email="acme@corp.com",
        recovery_enabled=True,
        max_retry_attempts=3,
        retry_cooldown_hours=0
    )
    
    # Create a dummy case for testing
    c_id = uuid.uuid4()
    case_id = uuid.uuid4()
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id,
        merchant_id=m_id,
        customer_id=c_id,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    
    # Configure mock Razorpay service for tests
    from app.services.razorpay_service import razorpay_service
    razorpay_service.key_id = "rzp_test_123"
    razorpay_service.key_secret = "secret_123"
    razorpay_service.webhook_secret = "webhook_123"
    
    # We mock the client methods below
    yield {"merchant_id": m_id, "case_id": case_id}

def test_create_payment_order(monkeypatch, reset_store):
    case_id = reset_store["case_id"]
    
    from app.services.razorpay_service import razorpay_service
    monkeypatch.setattr(razorpay_service, "is_configured", lambda: True)
    
    # Mock razorpay order creation
    def mock_create_order(amount, currency, receipt):
        return {
            "id": "order_test_123",
            "amount": int(amount * 100),
            "currency": currency,
            "receipt": receipt
        }
        
    from app.services.razorpay_service import razorpay_service
    monkeypatch.setattr(razorpay_service, "create_order", mock_create_order)
    
    resp = client.post(f"/api/v1/recovery-cases/{case_id}/payment-order")
    print(resp.json())
    assert resp.status_code == 200
    data = resp.json()
    assert data["order_id"] == "order_test_123"
    assert data["amount_paise"] == 500000
    
    # Verify mapping in store
    assert "order_test_123" in store.razorpay_orders
    assert store.razorpay_orders["order_test_123"]["case_id"] == case_id

def test_verify_payment_idempotency(monkeypatch, reset_store):
    case_id = reset_store["case_id"]
    
    # Inject an order mapping
    store.razorpay_orders["order_test_123"] = {
        "case_id": case_id,
        "amount": Decimal("5000.00"),
        "currency": "INR",
        "status": "created"
    }
    
    # Mock signature verification
    from app.services.razorpay_service import razorpay_service
    monkeypatch.setattr(razorpay_service, "verify_payment_signature", lambda **kwargs: True)
    monkeypatch.setattr(razorpay_service, "fetch_payment", lambda p: {"status": "captured", "amount": 500000})
    
    payload = {
        "razorpay_payment_id": "pay_test_123",
        "razorpay_order_id": "order_test_123",
        "razorpay_signature": "valid_sig"
    }
    
    # First verification
    resp1 = client.post(f"/api/v1/recovery-cases/{case_id}/verify-payment", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["recovered"] is True
    assert store.recovery_cases[case_id].status == RecoveryCaseStatus.RECOVERED
    assert store.recovery_cases[case_id].recovered_amount == Decimal("5000.00")
    
    # Second verification (Duplicate/Idempotency check)
    resp2 = client.post(f"/api/v1/recovery-cases/{case_id}/verify-payment", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["recovered"] is False # Idempotent return
    
    # Ensure only 1 success event was created
    success_events = [e for e in store.revenue_events.values() if e.event_type == RevenueEventType.PAYMENT_SUCCESS]
    assert len(success_events) == 1

def test_verify_payment_invalid_mapping(monkeypatch, reset_store):
    case_id = reset_store["case_id"]
    
    payload = {
        "razorpay_payment_id": "pay_test_123",
        "razorpay_order_id": "order_unknown",
        "razorpay_signature": "valid_sig"
    }
    
    resp = client.post(f"/api/v1/recovery-cases/{case_id}/verify-payment", json=payload)
    assert resp.status_code == 400
    assert "Unknown order ID" in resp.json()["detail"]

def test_webhook_processing_idempotency(monkeypatch, reset_store):
    case_id = reset_store["case_id"]
    
    # Inject an order mapping
    store.razorpay_orders["order_test_123"] = {
        "case_id": case_id,
        "amount": Decimal("5000.00"),
        "currency": "INR",
        "status": "created"
    }
    
    # Mock webhook signature verification
    from app.services.razorpay_service import razorpay_service
    monkeypatch.setattr(razorpay_service, "verify_webhook_signature", lambda raw, sig: True)
    
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_123",
                    "order_id": "order_test_123",
                    "amount": 500000,
                    "currency": "INR"
                }
            }
        }
    }
    
    # Simulate webhook delivery
    resp = client.post(
        "/api/v1/webhooks/razorpay", 
        json=payload,
        headers={"x-razorpay-signature": "valid_sig"}
    )
    assert resp.status_code == 200
    
    assert store.recovery_cases[case_id].status == RecoveryCaseStatus.RECOVERED
    
    # Send duplicate webhook
    resp2 = client.post(
        "/api/v1/webhooks/razorpay", 
        json=payload,
        headers={"x-razorpay-signature": "valid_sig"}
    )
    assert resp2.status_code == 200
    
    # Ensure no double counting
    success_events = [e for e in store.revenue_events.values() if e.event_type == RevenueEventType.PAYMENT_SUCCESS]
    assert len(success_events) == 1

def test_simulate_works_in_razorpay_mode(monkeypatch, reset_store):
    from app.config import settings
    monkeypatch.setattr(settings, "PAYMENT_PROVIDER_MODE", "razorpay")

    payload = {
        "event": "payment.failed",
        "payment_id": "pay_demo_test",
        "amount": 999.0,
        "currency": "INR",
        "email": "demo@flowmint.test",
        "contact": "9999999999"
    }

    # Simulate does not require signature headers
    resp = client.post("/api/v1/webhooks/simulate", json=payload)
    assert resp.status_code == 200
    
    data = resp.json()
    assert data["event"] == "payment.failed"
    
    # Verify the event exists and has correct source
    event_id = uuid.UUID(data["event_id"])
    assert event_id in store.revenue_events
    event = store.revenue_events[event_id]
    assert event.metadata.get("source") == "demo_simulator"
    
    # Verify a case was created
    case_id = data.get("case_id")
    assert case_id is not None
    assert uuid.UUID(case_id) in store.recovery_cases

def test_webhook_invalid_signature(monkeypatch, reset_store):
    from app.services.razorpay_service import razorpay_service
    # Explicitly mock it to return False
    monkeypatch.setattr(razorpay_service, "verify_webhook_signature", lambda raw, sig: False)
    
    payload = {"event": "payment.captured"}
    
    resp = client.post(
        "/api/v1/webhooks/razorpay", 
        json=payload,
        headers={"x-razorpay-signature": "invalid_sig"}
    )
    assert resp.status_code == 400
    assert "Invalid webhook signature" in resp.json()["detail"]

def test_webhook_missing_signature(monkeypatch, reset_store):
    payload = {"event": "payment.captured"}
    
    resp = client.post(
        "/api/v1/webhooks/razorpay", 
        json=payload
        # Missing headers
    )
    assert resp.status_code == 400
    assert "Invalid webhook signature" in resp.json()["detail"]

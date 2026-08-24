import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.config import settings
from app.models.domain import (
    Merchant,
    Customer,
    RevenueEventType,
    RecoveryCaseStatus,
    RiskLevel,
    RecoveryCase
)

client = TestClient(app)

MERCHANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")

@pytest.fixture
def clean_store():
    store.merchants.clear()
    store.customers.clear()
    store.revenue_events.clear()
    store.recovery_cases.clear()
    store.audit_logs.clear()
    
    # Preseed merchant
    store.merchants[MERCHANT_ID] = Merchant(
        id=MERCHANT_ID,
        name="Test Merchant",
        email="test@merchant.com",
        created_at=datetime.now(timezone.utc)
    )
    yield store

def sign_payload(body: bytes, secret: str = "test_webhook_secret") -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

def test_valid_webhook_payment_failed(clean_store):
    payload = {
        "entity": "event",
        "account_id": "acc_12345",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_failed_123",
                    "amount": 250000, # 2500.00 INR
                    "currency": "INR",
                    "email": "cust@fail.com",
                    "contact": "+919999999999",
                    "created_at": 1692816000
                }
            }
        },
        "created_at": 1692816000
    }
    body = json.dumps(payload).encode("utf-8")
    signature = sign_payload(body)
    
    response = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["case_id"] is not None
    
    # Verify event parsing (paise to INR)
    event_id = uuid.UUID(data["event_id"])
    event = store.revenue_events[event_id]
    assert event.amount == Decimal("2500.00")
    assert event.currency == "INR"
    assert event.event_type == RevenueEventType.PAYMENT_FAILED
    assert event.metadata["razorpay_payment_id"] == "pay_failed_123"
    
    # Verify auto customer creation
    customer = store.customers[event.customer_id]
    assert customer.email == "cust@fail.com"
    assert customer.phone == "+919999999999"
    assert customer.name == "cust"
    
    # Verify case creation & audit
    case_id = uuid.UUID(data["case_id"])
    case = store.recovery_cases[case_id]
    assert case.amount_at_risk == Decimal("2500.00")
    assert case.status == RecoveryCaseStatus.OPEN
    assert case.risk_level == RiskLevel.MEDIUM # based on deterministic scoring

def test_invalid_signature_rejected(clean_store):
    payload = {
        "event": "payment.failed",
        "payload": {"payment": {"entity": {"id": "pay_failed_123"}}}
    }
    body = json.dumps(payload).encode("utf-8")
    response = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": "invalid_sig_value", "Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid webhook signature"
    assert len(store.revenue_events) == 0

def test_missing_signature_rejected(clean_store):
    payload = {"event": "payment.failed"}
    body = json.dumps(payload).encode("utf-8")
    response = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing signature header"

def test_duplicate_webhook_is_idempotent(clean_store):
    payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_dup_999",
                    "amount": 10000,
                    "currency": "INR",
                    "email": "dup@test.com",
                    "contact": "+918888888888",
                    "created_at": 1692816000
                }
            }
        }
    }
    body = json.dumps(payload).encode("utf-8")
    signature = sign_payload(body)
    
    # First post
    res1 = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "processed"
    
    # Second post (duplicate)
    res2 = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "duplicate"
    assert res2.json()["message"] == "Event already processed"
    
    # Confirm only one event and case were created
    assert len(store.revenue_events) == 1
    assert len(store.recovery_cases) == 1

def test_malformed_json_body_handled(clean_store):
    headers = {"X-Razorpay-Signature": "some_sig", "Content-Type": "application/json"}
    response = client.post(
        "/api/v1/webhooks/razorpay",
        content="malformed json text",
        headers=headers
    )
    assert response.status_code == 400

def test_unsupported_event_ignored_gracefully(clean_store):
    payload = {
        "event": "unsupported.event.type",
        "payload": {"something": {"entity": {"id": "123"}}}
    }
    body = json.dumps(payload).encode("utf-8")
    signature = sign_payload(body)
    
    response = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"
    assert "unsupported event type" in response.json()["reason"]
    assert len(store.revenue_events) == 0

def test_payment_success_resolves_open_cases(clean_store):
    # Auto-seed customer
    cust_id = uuid.uuid4()
    store.customers[cust_id] = Customer(
        id=cust_id,
        merchant_id=MERCHANT_ID,
        name="Preseeded Cust",
        email="preseed@test.com",
        phone="+917777777777",
        created_at=datetime.now(timezone.utc)
    )
    
    # Create open case
    case_id = uuid.uuid4()
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id,
        merchant_id=MERCHANT_ID,
        customer_id=cust_id,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("150.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Webhook for payment captured (success)
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_success_777",
                    "amount": 15000, # 150.00 INR
                    "currency": "INR",
                    "email": "preseed@test.com",
                    "contact": "+917777777777",
                    "created_at": 1692816000
                }
            }
        }
    }
    body = json.dumps(payload).encode("utf-8")
    signature = sign_payload(body)
    response = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "processed"
    
    # Check that case status is now RECOVERED
    assert store.recovery_cases[case_id].status == RecoveryCaseStatus.RECOVERED

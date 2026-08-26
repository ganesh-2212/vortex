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
    RecoveryCase,
)
from app.api.v1.webhooks import (
    build_razorpay_webhook_payload,
    compute_razorpay_signature,
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

    store.merchants[MERCHANT_ID] = Merchant(
        id=MERCHANT_ID,
        name="Test Merchant",
        email="test@merchant.com",
        created_at=datetime.now(timezone.utc),
    )
    yield store


def simulate_payload(**overrides):
    payload = {
        "event": "payment.failed",
        "amount": 5000,
        "currency": "INR",
        "payment_id": f"pay_demo_{uuid.uuid4().hex[:8]}",
        "email": "demo@merchant.test",
        "contact": "9876543210",
    }
    payload.update(overrides)
    return payload


def test_simulator_creates_failed_payment_event(clean_store):
    body = simulate_payload(event="payment.failed", payment_id="pay_demo_failed_001")

    response = client.post("/api/v1/webhooks/simulate", json=body)
    assert response.status_code == 200

    data = response.json()
    assert data["webhook_accepted"] is True
    assert data["event"] == "payment.failed"
    assert data["payment_id"] == "pay_demo_failed_001"
    assert Decimal(str(data["amount"])) == Decimal("5000")
    assert data["result_status"] == "processed"

    event = store.revenue_events[uuid.UUID(data["event_id"])]
    assert event.event_type == RevenueEventType.PAYMENT_FAILED
    assert event.amount == Decimal("5000")
    assert event.metadata["source"] == "razorpay_webhook"


def test_failed_payment_creates_recovery_case(clean_store):
    body = simulate_payload(event="payment.failed", payment_id="pay_demo_failed_case")

    response = client.post("/api/v1/webhooks/simulate", json=body)
    assert response.status_code == 200

    data = response.json()
    assert data["case_id"] is not None

    case = store.recovery_cases[uuid.UUID(data["case_id"])]
    assert case.status == RecoveryCaseStatus.OPEN
    assert case.amount_at_risk == Decimal("5000")
    assert case.risk_level == RiskLevel.MEDIUM


def test_simulator_creates_successful_payment_event(clean_store):
    body = simulate_payload(event="payment.captured", payment_id="pay_demo_success_001")

    response = client.post("/api/v1/webhooks/simulate", json=body)
    assert response.status_code == 200

    data = response.json()
    assert data["event"] == "payment.captured"
    assert data["result_status"] == "processed"

    event = store.revenue_events[uuid.UUID(data["event_id"])]
    assert event.event_type == RevenueEventType.PAYMENT_SUCCESS
    assert event.status == "SUCCESS"


def test_successful_payment_resolves_matching_case(clean_store):
    cust_id = uuid.uuid4()
    store.customers[cust_id] = Customer(
        id=cust_id,
        merchant_id=MERCHANT_ID,
        name="Demo Customer",
        email="demo@merchant.test",
        phone="9876543210",
        created_at=datetime.now(timezone.utc),
    )

    case_id = uuid.uuid4()
    store.recovery_cases[case_id] = RecoveryCase(
        id=case_id,
        merchant_id=MERCHANT_ID,
        customer_id=cust_id,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    body = simulate_payload(event="payment.captured", payment_id="pay_demo_recovered_001")

    response = client.post("/api/v1/webhooks/simulate", json=body)
    assert response.status_code == 200
    assert response.json()["result_status"] == "processed"

    assert store.recovery_cases[case_id].status == RecoveryCaseStatus.RECOVERED


def test_generated_webhook_signature_is_valid(clean_store):
    payload = build_razorpay_webhook_payload(
        event="payment.failed",
        payment_id="pay_demo_sig",
        amount_inr=Decimal("5000"),
        currency="INR",
        email="demo@merchant.test",
        contact="9876543210",
    )
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = compute_razorpay_signature(body)

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    assert signature == expected

    response = client.post(
        "/api/v1/webhooks/razorpay",
        content=body,
        headers={
            "X-Razorpay-Signature": signature,
            "Content-Type": "application/json",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "processed"


def test_simulator_rejected_in_razorpay_mode(clean_store):
    orig_mode = settings.PAYMENT_PROVIDER_MODE
    settings.PAYMENT_PROVIDER_MODE = "razorpay"
    try:
        response = client.post("/api/v1/webhooks/simulate", json=simulate_payload())
        assert response.status_code == 403
        assert "mock" in response.json()["detail"].lower()
    finally:
        settings.PAYMENT_PROVIDER_MODE = orig_mode


def test_duplicate_payment_ids_remain_idempotent(clean_store):
    body = simulate_payload(event="payment.failed", payment_id="pay_demo_dup_001")

    first = client.post("/api/v1/webhooks/simulate", json=body)
    second = client.post("/api/v1/webhooks/simulate", json=body)

    assert first.status_code == 200
    assert first.json()["result_status"] == "processed"
    assert second.status_code == 200
    assert second.json()["result_status"] == "duplicate"
    assert len(store.revenue_events) == 1
    assert len(store.recovery_cases) == 1

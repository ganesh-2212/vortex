import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import RecoveryCaseStatus, RecoveryActionType, RecoveryActionStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_store():
    store.clear()
    m_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    from app.models.domain import Merchant
    store.merchants[m_id] = Merchant(
        id=m_id,
        name="Acme Corp",
        email="acme@corp.com",
        recovery_enabled=True,
        max_retry_attempts=3,
        retry_cooldown_hours=0
    )
    yield

def test_end_to_end_success_path():
    """
    Tests the full lifecycle:
    Webhook Failed -> Case Created -> F11 Recommendation -> F13 Orchestrate -> F10 Guardrails -> Webhook Captured -> Case Recovered
    """
    payment_id = "pay_e2e_success_123"
    
    # 1. Simulate failure webhook
    resp = client.post(
        "/api/v1/webhooks/simulate",
        json={
            "event": "payment.failed",
            "payment_id": payment_id,
            "amount": 8000.00,
            "currency": "INR",
            "email": "e2e_success@test.com",
            "contact": "+910000000000"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["webhook_accepted"] is True
    case_id = data["case_id"]
    
    # 2. Strategy Recommendation (F11)
    resp_rec = client.get(f"/api/v1/recovery-cases/{case_id}/recommendation")
    assert resp_rec.status_code == 200
    rec_data = resp_rec.json()
    assert rec_data["recommendation"]["recommended_action"] == "RETRY_PAYMENT"
    
    # 3. Orchestrate Evaluation (F13)
    resp_orch = client.post(f"/api/v1/recovery-cases/{case_id}/orchestration/evaluate")
    assert resp_orch.status_code == 200
    orch_data = resp_orch.json()
    assert orch_data["decision"] == "EXECUTE_NOW"
    
    # 4. Propose Action (F10 Guardrails)
    resp_prop = client.post(
        f"/api/v1/recovery-cases/{case_id}/actions",
        json={"action_type": "RETRY_PAYMENT"}
    )
    assert resp_prop.status_code == 200
    assert resp_prop.json()["status"] == "ALLOWED"
    
    # (In a real system, execution to razorpay would happen here)
    
    # 5. Simulate success webhook
    resp_succ = client.post(
        "/api/v1/webhooks/simulate",
        json={
            "event": "payment.captured",
            "payment_id": payment_id,
            "amount": 8000.00,
            "currency": "INR",
            "email": "e2e_success@test.com",
            "contact": "+910000000000"
        }
    )
    assert resp_succ.status_code == 200
    
    # Verify recovered state
    case = store.recovery_cases[uuid.UUID(case_id)]
    assert case.status == RecoveryCaseStatus.RECOVERED

def test_duplicate_webhook_rejected():
    payment_id = "pay_dup_456"
    payload = {
        "event": "payment.failed",
        "payment_id": payment_id,
        "amount": 1000.00,
        "currency": "INR",
        "email": "dup@test.com",
        "contact": "+910000000000"
    }
    
    resp1 = client.post("/api/v1/webhooks/simulate", json=payload)
    assert resp1.status_code == 200
    
    resp2 = client.post("/api/v1/webhooks/simulate", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["result_status"] == "duplicate"
    
    cases = [c for c in store.recovery_cases.values() if c.amount_at_risk == Decimal("1000.00")]
    assert len(cases) == 1

def test_orchestration_max_retries_and_already_recovered():
    m_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    store.merchants[m_id].max_retry_attempts = 1
    
    payment_id = "pay_max_retries"
    resp = client.post(
        "/api/v1/webhooks/simulate",
        json={
            "event": "payment.failed",
            "payment_id": payment_id,
            "amount": 2500.00,
            "currency": "INR",
            "email": "max@test.com",
            "contact": "+910000000000"
        }
    )
    case_id = resp.json()["case_id"]
    
    # 1st Action (Retry 1) - allowed
    resp_prop1 = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={"action_type": "RETRY_PAYMENT"})
    assert resp_prop1.json()["status"] == "ALLOWED"
    
    # 2nd Action (Retry 2) - blocked due to max retries
    resp_prop2 = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={"action_type": "RETRY_PAYMENT"})
    assert resp_prop2.json()["status"] == "BLOCKED"
    assert "Maximum retry attempts reached" in resp_prop2.json()["reason"]
    
    # Simulate payment success to mark as recovered
    client.post(
        "/api/v1/webhooks/simulate",
        json={"event": "payment.captured", "payment_id": payment_id, "amount": 2500.00, "currency": "INR", "email": "max@test.com", "contact": "+910000000000"}
    )
    
    # 3rd Action on RECOVERED case - blocked
    resp_prop3 = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={"action_type": "RETRY_PAYMENT"})
    assert resp_prop3.json()["status"] == "BLOCKED"
    assert "RECOVERED" in resp_prop3.json()["reason"]

def test_orchestration_cooldown():
    m_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    store.merchants[m_id].retry_cooldown_hours = 24
    
    payment_id = "pay_cooldown"
    resp = client.post(
        "/api/v1/webhooks/simulate",
        json={"event": "payment.failed", "payment_id": payment_id, "amount": 1000.00, "currency": "INR", "email": "cool@test.com", "contact": "+91"}
    )
    case_id = resp.json()["case_id"]
    
    # 1st Action
    resp1 = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={"action_type": "RETRY_PAYMENT"})
    assert resp1.json()["status"] == "ALLOWED"
    
    # 2nd Action blocked by cooldown
    resp2 = client.post(f"/api/v1/recovery-cases/{case_id}/actions", json={"action_type": "RETRY_PAYMENT"})
    assert resp2.json()["status"] == "BLOCKED"
    assert "Cooldown active" in resp2.json()["reason"]

import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
    RevenueEvent,
    RevenueEventType
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown():
    store.clear()
    yield
    store.clear()

def test_strategy_performance_razorpay_integration():
    merchant_id = uuid.uuid4()
    case_id = uuid.uuid4()
    
    # 1. Setup case
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        customer_id=uuid.uuid4(),
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("5000.00"),
        risk_level="HIGH"
    )
    store.recovery_cases[case_id] = case
    
    # 2. Test 1: Payment-order creation creates a RecoveryAction with ALLOWED status
    response = client.post(f"/api/v1/recovery-cases/{case_id}/payment-order")
    assert response.status_code == 200
    order_data = response.json()
    order_id = order_data["order_id"]
    
    # Action should be created
    actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case_id]
    assert len(actions) == 1
    action = actions[0]
    
    # Action type and status must match what we configured
    assert action.action_type == RecoveryActionType.RETRY_PAYMENT
    assert action.status == RecoveryActionStatus.ALLOWED
    
    # 3. Test 4: Strategy Performance shouldn't see it yet since it's not EXECUTED
    perf_response = client.get("/api/v1/strategy-performance")
    assert perf_response.status_code == 200
    perf = perf_response.json()
    
    retry_stat = next(s for s in perf["strategy_statistics"] if s["strategy_type"] == "IMMEDIATE_RETRY")
    assert retry_stat["total_attempts"] == 0
    
    # 4. Test 2: Successful payment.captured changes action to EXECUTED
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_123",
                    "order_id": order_id
                }
            }
        }
    }
    
    # Mock signature verification for test
    from app.services.razorpay_service import razorpay_service
    original_verify = razorpay_service.verify_webhook_signature
    razorpay_service.verify_webhook_signature = lambda p, s: True
    
    webhook_res = client.post(
        "/api/v1/webhooks/razorpay",
        json=payload,
        headers={"x-razorpay-signature": "dummy"}
    )
    assert webhook_res.status_code == 200
    
    # Restore original method
    razorpay_service.verify_webhook_signature = original_verify
    
    # Action should now be EXECUTED
    action = store.recovery_actions[action.id]
    assert action.status == RecoveryActionStatus.EXECUTED
    
    # Test 3: Executed action contains razorpay ID
    assert action.result["payment_id"] == "pay_test_123"
    assert action.result["outcome"] == "SUCCESS"
    
    # 5. Test 4: Strategy Performance sees the successful action
    perf_response = client.get("/api/v1/strategy-performance")
    assert perf_response.status_code == 200
    perf = perf_response.json()
    
    retry_stat = next(s for s in perf["strategy_statistics"] if s["strategy_type"] == "IMMEDIATE_RETRY")
    
    assert perf["total_cases_analyzed"] == 1
    assert perf["total_revenue_recovered"] == "5000.00"
    assert retry_stat["total_attempts"] == 1
    assert retry_stat["successful_attempts"] == 1
    assert retry_stat["total_recovered"] == "5000.00"

def test_duplicate_webhook_does_not_double_count():
    merchant_id = uuid.uuid4()
    case_id = uuid.uuid4()
    
    case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        customer_id=uuid.uuid4(),
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("1000.00"),
        risk_level="MEDIUM"
    )
    store.recovery_cases[case_id] = case
    
    response = client.post(f"/api/v1/recovery-cases/{case_id}/payment-order")
    order_id = response.json()["order_id"]
    
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_dup",
                    "order_id": order_id
                }
            }
        }
    }
    
    from app.services.razorpay_service import razorpay_service
    original_verify = razorpay_service.verify_webhook_signature
    razorpay_service.verify_webhook_signature = lambda p, s: True
    
    # First webhook
    client.post("/api/v1/webhooks/razorpay", json=payload, headers={"x-razorpay-signature": "dummy"})
    # Second webhook
    client.post("/api/v1/webhooks/razorpay", json=payload, headers={"x-razorpay-signature": "dummy"})
    
    razorpay_service.verify_webhook_signature = original_verify
    
    perf = client.get("/api/v1/strategy-performance").json()
    retry_stat = next(s for s in perf["strategy_statistics"] if s["strategy_type"] == "IMMEDIATE_RETRY")
    
    # Test 5: Duplicate does not double count
    assert retry_stat["total_attempts"] == 1
    assert perf["total_revenue_recovered"] == "1000.00"

import os
import sys
import uuid
import pytest
from decimal import Decimal
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.main import app
from app.store import store
from app.config import settings
from app.models.domain import (
    Merchant, Customer, RecoveryCase, RecoveryCaseStatus,
    RecoveryAction, RecoveryActionType, RecoveryActionStatus, RiskLevel
)
from app.services.providers import MockPaymentProvider, RazorpayPaymentProvider
from app.services.guardrails import evaluate_guardrails

client = TestClient(app)
MERCHANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
CUSTOMER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

@pytest.fixture
def test_setup():
    store.clear()
    
    # Preseed merchant and customer
    store.merchants[MERCHANT_ID] = Merchant(
        id=MERCHANT_ID,
        name="Acme Corp",
        email="acme@corp.com",
        recovery_enabled=True,
        max_retry_attempts=3,
        retry_cooldown_hours=24,
        supported_recovery_actions=["RETRY_PAYMENT", "ESCALATE_TO_HUMAN", "STOP_RECOVERY"],
        escalation_behavior="MANUAL",
        webhook_status="CONFIGURED"
    )
    store.customers[CUSTOMER_ID] = Customer(
        id=CUSTOMER_ID,
        merchant_id=MERCHANT_ID,
        name="John Doe",
        email="john@doe.com"
    )
    yield store


def test_default_provider_mode():
    """1. Default provider is mock."""
    assert settings.PAYMENT_PROVIDER_MODE == "mock"


def test_invalid_provider_mode_rejected():
    """2. Invalid provider mode rejected."""
    from pydantic import ValidationError
    from app.config import Settings
    
    # Attempting to construct Settings with invalid PAYMENT_PROVIDER_MODE should raise ValidationError
    with pytest.raises(ValidationError):
        Settings(PAYMENT_PROVIDER_MODE="invalid_mode")


def test_razorpay_provider_credential_validation():
    """3. Razorpay provider configuration validation."""
    # Temporarily clear credentials in settings
    orig_key = settings.RAZORPAY_KEY_ID
    orig_secret = settings.RAZORPAY_KEY_SECRET
    
    settings.RAZORPAY_KEY_ID = ""
    settings.RAZORPAY_KEY_SECRET = ""
    
    provider = RazorpayPaymentProvider()
    with pytest.raises(ValueError) as exc:
        provider.execute_retry(Decimal("100.00"), "INR", {})
    assert "Razorpay credentials" in str(exc.value)
    
    # Restore credentials
    settings.RAZORPAY_KEY_ID = orig_key
    settings.RAZORPAY_KEY_SECRET = orig_secret


def test_missing_credentials_fail_safely_during_execution(test_setup):
    """4. Missing Razorpay credentials fail safely."""
    # Switch mode to razorpay
    orig_mode = settings.PAYMENT_PROVIDER_MODE
    orig_key = settings.RAZORPAY_KEY_ID
    orig_secret = settings.RAZORPAY_KEY_SECRET
    
    settings.PAYMENT_PROVIDER_MODE = "razorpay"
    settings.RAZORPAY_KEY_ID = ""
    settings.RAZORPAY_KEY_SECRET = ""
    
    try:
        # Create a test case and proposed action
        case_id = uuid.uuid4()
        case = RecoveryCase(
            id=case_id,
            merchant_id=MERCHANT_ID,
            customer_id=CUSTOMER_ID,
            revenue_event_id=uuid.uuid4(),
            amount_at_risk=Decimal("500.00"),
            risk_level=RiskLevel.HIGH,
            status=RecoveryCaseStatus.OPEN
        )
        store.recovery_cases[case_id] = case
        
        action_id = uuid.uuid4()
        action = RecoveryAction(
            id=action_id,
            recovery_case_id=case_id,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            status=RecoveryActionStatus.ALLOWED,
            attempt_number=1
        )
        store.recovery_actions[action_id] = action
        
        # Execute action - should complete safely as FAILED without crashing the server
        from app.services.execution import execute_recovery_action
        result = execute_recovery_action(case, action, {})
        
        assert result.status == "FAILED"
        assert "Razorpay credentials" in result.result["provider_response"]["error"]
    finally:
        # Restore configs
        settings.PAYMENT_PROVIDER_MODE = orig_mode
        settings.RAZORPAY_KEY_ID = orig_key
        settings.RAZORPAY_KEY_SECRET = orig_secret


def test_mock_provider_behavior(test_setup):
    """5. Mock provider behavior remains unchanged."""
    provider = MockPaymentProvider()
    res = provider.execute_retry(Decimal("100.00"), "INR", {})
    assert res.success is True
    assert res.transaction_id.startswith("pay_mock_")


def test_invalid_guardrail_configuration_rejected(test_setup):
    """6. Invalid guardrail configuration rejected."""
    # Test update with negative attempts
    payload = {
        "recovery_enabled": True,
        "max_retry_attempts": -1, # negative limit
        "retry_cooldown_hours": 24,
        "supported_recovery_actions": ["RETRY_PAYMENT"],
        "escalation_behavior": "MANUAL",
        "webhook_status": "CONFIGURED"
    }
    response = client.put(f"/api/v1/merchants/{MERCHANT_ID}/config", json=payload)
    assert response.status_code == 400
    assert "attempts" in response.json()["detail"]
    
    # Test update with negative cooldown
    payload["max_retry_attempts"] = 3
    payload["retry_cooldown_hours"] = -2
    response = client.put(f"/api/v1/merchants/{MERCHANT_ID}/config", json=payload)
    assert response.status_code == 400
    assert "cooldown" in response.json()["detail"]

    # Test update with invalid action type
    payload["retry_cooldown_hours"] = 24
    payload["supported_recovery_actions"] = ["INVALID_ACTION"]
    response = client.put(f"/api/v1/merchants/{MERCHANT_ID}/config", json=payload)
    assert response.status_code == 400
    assert "supported recovery action" in response.json()["detail"]


def test_valid_guardrail_configuration_accepted(test_setup):
    """7. Valid guardrail configuration accepted."""
    payload = {
        "recovery_enabled": True,
        "max_retry_attempts": 5,
        "retry_cooldown_hours": 48,
        "supported_recovery_actions": ["RETRY_PAYMENT", "STOP_RECOVERY"],
        "escalation_behavior": "AUTOMATIC",
        "webhook_status": "CONFIGURED"
    }
    response = client.put(f"/api/v1/merchants/{MERCHANT_ID}/config", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["max_retry_attempts"] == 5
    assert data["retry_cooldown_hours"] == 48
    assert data["supported_recovery_actions"] == ["RETRY_PAYMENT", "STOP_RECOVERY"]


def test_guardrails_cannot_be_bypassed(test_setup):
    """8. Guardrails cannot be bypassed."""
    # Set merchant recovery configuration max retry to 0
    merchant = store.merchants[MERCHANT_ID]
    merchant.max_retry_attempts = 0
    
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("100.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    
    res = evaluate_guardrails(
        case=case,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        attempt_number=1,
        existing_actions=[],
        current_time=datetime.now(timezone.utc)
    )
    assert res.is_allowed is False
    assert "Maximum retry attempts reached" in res.reason


def test_resolved_cases_cannot_execute(test_setup):
    """9. Resolved cases cannot execute actions."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("100.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.RECOVERED
    )
    res = evaluate_guardrails(
        case=case,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        attempt_number=1,
        existing_actions=[],
        current_time=datetime.now(timezone.utc)
    )
    assert res.is_allowed is False
    assert "Case is already RECOVERED" in res.reason


def test_duplicate_execution_prevention(test_setup):
    """10. Duplicate execution remains impossible."""
    case = RecoveryCase(
        id=uuid.uuid4(),
        merchant_id=MERCHANT_ID,
        customer_id=CUSTOMER_ID,
        revenue_event_id=uuid.uuid4(),
        amount_at_risk=Decimal("100.00"),
        risk_level=RiskLevel.MEDIUM,
        status=RecoveryCaseStatus.OPEN
    )
    
    # Create a retry action that has already been EXECUTED
    act1 = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case.id,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        status=RecoveryActionStatus.EXECUTED,
        attempt_number=1
    )
    
    # Attempting to execute an already executed action should fail
    from app.services.execution import execute_recovery_action
    try:
        execute_recovery_action(case, act1, {})
        pytest.fail("Should have raised ValueError")
    except ValueError as val_err:
        assert "Action cannot be executed" in str(val_err)


def test_get_default_merchant_config_auto_seeded():
    """Test that requesting default merchant config does not 404 even if store starts empty."""
    store.clear()
    response = client.get(f"/api/v1/merchants/{MERCHANT_ID}/config")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(MERCHANT_ID)
    assert data["name"] == "Acme Corp"

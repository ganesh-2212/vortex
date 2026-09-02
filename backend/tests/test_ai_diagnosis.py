import uuid
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.store import store
from app.models.domain import RecoveryCase, RevenueEvent, RiskLevel, RevenueEventType
from app.config import settings

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
            "error_reason": "network_error",
            "method": "upi"
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
        risk_level=RiskLevel.MEDIUM
    )
    store.recovery_cases[case_id] = case
    
    # Clean audit logs
    store.audit_logs.clear()
    
    yield case_id
    
    if case_id in store.recovery_cases:
        del store.recovery_cases[case_id]
    if event_id in store.revenue_events:
        del store.revenue_events[event_id]

@patch("app.config.settings.GEMINI_API_KEY", "")
def test_ai_diagnosis_missing_api_key_fallback(setup_diagnosis_case):
    case_id = setup_diagnosis_case
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    
    data = response.json()
    assert data["root_cause_category"] == "PAYMENT_NETWORK_FAILURE"
    assert data["recommended_action"] == "RETRY_PAYMENT"
    assert data["analysis_source"] == "Deterministic analysis"

@patch("app.config.settings.GEMINI_API_KEY", "fake_key")
@patch("google.genai.Client")
def test_ai_diagnosis_valid_gemini(mock_client, setup_diagnosis_case):
    case_id = setup_diagnosis_case
    
    mock_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = """
    {
      "root_cause_category": "TRANSIENT_PAYMENT_FAILURE",
      "root_cause": "Temporary network timeout on UPI.",
      "evidence": ["UPI failure pattern", "First failure"],
      "risk_explanation": "Low risk, transient.",
      "recommended_action": "RETRY_PAYMENT",
      "action_reason": "Standard for transient UPI failure.",
      "confidence": 88
    }
    """
    mock_instance.models.generate_content.return_value = mock_response
    mock_client.return_value = mock_instance
    
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    
    data = response.json()
    assert data["root_cause_category"] == "TRANSIENT_PAYMENT_FAILURE"
    assert data["recommended_action"] == "RETRY_PAYMENT"
    assert data["confidence"] == 88
    assert data["analysis_source"] == "gemini"
    
    # Check audit log
    assert len(store.audit_logs) > 0
    log = store.audit_logs[-1]
    assert log.action == "AI_DIAGNOSIS_GENERATED"
    assert log.details["analysis_source"] == "gemini"

@patch("app.config.settings.GEMINI_API_KEY", "fake_key")
@patch("google.genai.Client")
def test_ai_diagnosis_invalid_json_fallback(mock_client, setup_diagnosis_case):
    case_id = setup_diagnosis_case
    
    mock_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is not JSON"
    mock_instance.models.generate_content.return_value = mock_response
    mock_client.return_value = mock_instance
    
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    
    data = response.json()
    # Falls back to deterministic
    assert data["analysis_source"] == "Deterministic analysis"
    assert data["root_cause_category"] == "PAYMENT_NETWORK_FAILURE"

@patch("app.config.settings.GEMINI_API_KEY", "fake_key")
@patch("google.genai.Client")
def test_ai_diagnosis_provider_failure_fallback(mock_client, setup_diagnosis_case):
    case_id = setup_diagnosis_case
    
    mock_instance = MagicMock()
    mock_instance.models.generate_content.side_effect = Exception("API Timeout")
    mock_client.return_value = mock_instance
    
    response = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response.status_code == 200
    
    data = response.json()
    assert data["analysis_source"] == "Deterministic analysis"

@patch("app.config.settings.GEMINI_API_KEY", "fake_key")
@patch("google.genai.Client")
def test_ai_diagnosis_caching_behavior(mock_client, setup_diagnosis_case):
    case_id = setup_diagnosis_case
    
    mock_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = """
    {
      "root_cause_category": "TRANSIENT_PAYMENT_FAILURE",
      "root_cause": "Temporary network timeout on UPI.",
      "evidence": ["UPI failure pattern", "First failure"],
      "risk_explanation": "Low risk, transient.",
      "recommended_action": "RETRY_PAYMENT",
      "action_reason": "Standard for transient UPI failure.",
      "confidence": 88
    }
    """
    mock_instance.models.generate_content.return_value = mock_response
    mock_client.return_value = mock_instance
    
    # TEST 1: First call
    store.audit_logs.clear()
    response1 = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["analysis_source"] == "gemini"
    assert mock_instance.models.generate_content.call_count == 1
    assert len(store.audit_logs) == 1
    
    # Verify persistence
    case = store.recovery_cases[case_id]
    assert case.ai_diagnosis is not None
    assert case.ai_diagnosis["analysis_source"] == "gemini"
    
    # TEST 2: Second call (cached)
    response2 = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response2.status_code == 200
    data2 = response2.json()
    
    assert data1 == data2
    # Should not call API again
    assert mock_instance.models.generate_content.call_count == 1
    # Should not log another audit event
    assert len(store.audit_logs) == 1

@patch("app.config.settings.GEMINI_API_KEY", "fake_key")
@patch("google.genai.Client")
def test_ai_diagnosis_temporary_failure_not_cached(mock_client, setup_diagnosis_case):
    case_id = setup_diagnosis_case
    
    mock_instance = MagicMock()
    # First call fails
    mock_instance.models.generate_content.side_effect = Exception("API Timeout")
    mock_client.return_value = mock_instance
    
    # TEST 3: Provider failure
    response1 = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response1.status_code == 200
    assert response1.json()["analysis_source"] == "Deterministic analysis"
    
    # Case should not be poisoned (no ai_diagnosis saved)
    case = store.recovery_cases[case_id]
    assert case.ai_diagnosis is None
    
    # Now it succeeds
    mock_response = MagicMock()
    mock_response.text = """
    {
      "root_cause_category": "TRANSIENT_PAYMENT_FAILURE",
      "root_cause": "Success later",
      "evidence": [],
      "risk_explanation": "Low risk",
      "recommended_action": "RETRY_PAYMENT",
      "action_reason": "test",
      "confidence": 99
    }
    """
    mock_instance.models.generate_content.side_effect = None
    mock_instance.models.generate_content.return_value = mock_response
    
    # TEST 4: Later successful call is persisted
    response2 = client.get(f"/api/v1/recovery-cases/{case_id}/diagnosis")
    assert response2.status_code == 200
    assert response2.json()["analysis_source"] == "gemini"
    assert store.recovery_cases[case_id].ai_diagnosis is not None

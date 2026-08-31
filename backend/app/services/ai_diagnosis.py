import uuid
from datetime import datetime, timezone
from typing import Optional

from app.store import store
from app.models.diagnosis import DiagnosisResult
from app.services.guardrails import evaluate_guardrails
from app.models.domain import RecoveryActionType

def generate_diagnosis(case_id: uuid.UUID) -> Optional[DiagnosisResult]:
    """
    Generates an AI Root-Cause Diagnosis using deterministic rules based on event metadata.
    This is a completely read-only operation.
    """
    case = store.recovery_cases.get(case_id)
    if not case:
        return None
        
    event = store.revenue_events.get(case.revenue_event_id)
    if not event:
        return None

    # Collect Evidence
    evidence = []
    error_reason = event.metadata.get("error_reason") or event.metadata.get("razorpay_error_reason", "unknown")
    method = event.metadata.get("method", "unknown")
    
    evidence.append(f"error_reason = {error_reason}")
    evidence.append(f"payment method = {method}")
    evidence.append(f"currency = {event.currency}")

    # Default to Unknown
    category = "UNKNOWN_PAYMENT_FAILURE"
    root_cause = "The payment failed due to an unidentified or missing error reason from the payment gateway."
    risk_explanation = "The cause of failure cannot be definitively identified from the available payment metadata."
    action = "ESCALATE_TO_HUMAN"
    reason = "Manual review is required because the automated system cannot safely determine a retry path."
    confidence = 60
    
    # Deterministic mapping
    if error_reason == "international_transaction_not_allowed":
        category = "INTERNATIONAL_CARD_RESTRICTION"
        root_cause = "International card transaction rejected because the merchant accepts domestic Indian card payments only."
        risk_explanation = "Repeating the same card attempt is unlikely to succeed because the failure is related to payment-method restrictions."
        action = "ALTERNATIVE_PAYMENT_METHOD"
        reason = "Changing the payment method addresses the identified failure cause."
        confidence = 95
        
    elif error_reason == "insufficient_funds":
        category = "INSUFFICIENT_FUNDS"
        root_cause = "The customer's bank declined the transaction due to insufficient funds in their account."
        risk_explanation = "Immediate retries have a high probability of failure until the customer resolves their balance."
        action = "RETRY_PAYMENT"
        reason = "A scheduled retry allows time for the customer to add funds."
        confidence = 90
        
    elif error_reason in ("authentication_failed", "3d_secure_failed"):
        category = "PAYMENT_AUTHENTICATION_FAILURE"
        root_cause = "The transaction failed during 3D Secure or OTP authentication."
        risk_explanation = "The customer likely abandoned the authentication step or entered incorrect details."
        action = "RETRY_PAYMENT"
        reason = "Prompting the customer to retry authentication often resolves this issue."
        confidence = 85
        
    elif error_reason == "network_error":
        category = "PAYMENT_NETWORK_FAILURE"
        root_cause = "A temporary network timeout occurred between the payment gateway and the issuing bank."
        risk_explanation = "This is a transient issue that does not indicate a problem with the customer's payment method."
        action = "RETRY_PAYMENT"
        reason = "Transient network failures are highly recoverable through immediate or scheduled retries."
        confidence = 90
        
    elif error_reason == "card_declined":
        category = "CARD_DECLINED"
        root_cause = "The issuing bank declined the card for an unspecified risk or policy reason."
        risk_explanation = "Banks rarely approve identical subsequent requests for generically declined cards."
        action = "ALTERNATIVE_PAYMENT_METHOD"
        reason = "Using a different card, UPI, or netbanking bypasses the issuing bank's block."
        confidence = 85
        
    # Check Guardrails
    guardrail_status = "SAFE TO PROCEED"
    if action == "RETRY_PAYMENT":
        existing_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
        completed_retries = [
            a for a in existing_actions
            if a.action_type == RecoveryActionType.RETRY_PAYMENT and a.status.value in ("EXECUTED", "FAILED")
        ]
        attempt_number = len(completed_retries) + 1
        
        gr = evaluate_guardrails(
            case=case,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            attempt_number=attempt_number,
            existing_actions=existing_actions,
            current_time=datetime.now(timezone.utc)
        )
        if not gr.is_allowed:
            guardrail_status = f"BLOCKED BY GUARDRAIL: {gr.reason}"
    
    return DiagnosisResult(
        root_cause_category=category,
        root_cause=root_cause,
        evidence=evidence,
        risk_explanation=risk_explanation,
        recommended_action=action,
        action_reason=reason,
        confidence=confidence,
        guardrail_status=guardrail_status,
        analysis_source="Deterministic analysis"
    )

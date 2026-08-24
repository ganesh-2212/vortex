import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionStatus,
    RecoveryActionType,
    RiskLevel,
    RecommendationReason,
    RecoveryRecommendation,
    RecommendationResponse,
    AutomationSummary
)
from app.services.intelligence import get_single_case_intelligence
from app.services.guardrails import evaluate_guardrails

def recommend_action(store, case: RecoveryCase, current_time: datetime) -> RecoveryRecommendation:
    """
    Evaluates an active recovery case and returns a deterministic recovery recommendation
    with confidence scores and reasons. Never executes actions automatically.
    """
    # 1. Active cases only
    if case.status in (RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.STOPPED):
        raise ValueError("Recommendations are only available for active cases")
        
    # 2. Retrieve case intelligence metrics (Priority, TimeSensitivity, EstimatedRecoverable)
    intel = get_single_case_intelligence(case.id, store, current_time)
    if not intel:
        raise ValueError("Failed to retrieve case intelligence telemetry")
        
    # 3. Retrieve retry attempts history
    existing_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
    retry_attempts = [
        a for a in existing_actions 
        if a.action_type == RecoveryActionType.RETRY_PAYMENT 
        and a.status in (RecoveryActionStatus.EXECUTED, RecoveryActionStatus.FAILED)
    ]
    attempt_number = len(retry_attempts) + 1
    
    # 4. Evaluate guardrails for retry
    guardrail_result = evaluate_guardrails(
        case=case,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        attempt_number=attempt_number,
        existing_actions=existing_actions,
        current_time=current_time
    )
    guardrail_status = "ALLOWED" if guardrail_result.is_allowed else "BLOCKED"
    
    # 5. Deterministic Precedence Rules
    if len(retry_attempts) >= 3 or intel.estimated_recoverable == 0:
        recommended_action = RecoveryActionType.STOP_RECOVERY
    elif (
        case.risk_level == RiskLevel.CRITICAL
        or not guardrail_result.is_allowed
        or intel.time_sensitivity.category in ("AGING", "STALE")
        or len(retry_attempts) >= 2
    ):
        recommended_action = RecoveryActionType.ESCALATE_TO_HUMAN
    else:
        recommended_action = RecoveryActionType.RETRY_PAYMENT
        
    # 6. Calculate Confidence
    confidence = calculate_recommendation_confidence(case, recommended_action, guardrail_result, len(retry_attempts), intel.time_sensitivity.category)
    
    # 7. Generate reasons
    reasons = generate_recommendation_reasons(case, recommended_action, guardrail_result, len(retry_attempts), intel)
    
    return RecoveryRecommendation(
        case_id=case.id,
        recommended_action=recommended_action,
        confidence=confidence,
        priority_score=intel.priority_score,
        risk_level=case.risk_level,
        time_sensitivity=intel.time_sensitivity.category,
        estimated_recoverable=intel.estimated_recoverable,
        guardrail_status=guardrail_status,
        reasons=reasons,
        generated_at=current_time
    )

def recommend_for_all_open_cases(store, current_time: datetime) -> List[RecommendationResponse]:
    """
    Evaluates all active open recovery cases and returns recommendations sorted by priority score descending.
    """
    active_statuses = {RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS, RecoveryCaseStatus.ESCALATED}
    active_cases = [c for c in store.recovery_cases.values() if c.status in active_statuses]
    
    responses = []
    for case in active_cases:
        rec = recommend_action(store, case, current_time)
        
        # Propose safe alternative actions if RETRY is blocked or recommended action is escalate/stop
        alternatives = []
        if rec.recommended_action == RecoveryActionType.RETRY_PAYMENT:
            alternatives = [RecoveryActionType.ESCALATE_TO_HUMAN, RecoveryActionType.STOP_RECOVERY]
        elif rec.recommended_action == RecoveryActionType.ESCALATE_TO_HUMAN:
            alternatives = [RecoveryActionType.STOP_RECOVERY]
            
        responses.append(RecommendationResponse(
            case_id=case.id,
            recommendation=rec,
            alternative_actions=alternatives,
            generated_at=current_time
        ))
        
    # Sort by priority score descending
    responses.sort(key=lambda x: x.recommendation.priority_score, reverse=True)
    return responses

def calculate_recommendation_confidence(
    case: RecoveryCase,
    action_type: RecoveryActionType,
    guardrail_result,
    retry_attempts_count: int,
    time_sensitivity_category: str
) -> int:
    """
    Deterministic confidence calculation formula:
    Base confidence:
      - Strong match (Fresh High-Risk retry): 90
      - Normal match (Escalation / retry allowed): 75
      - Weak match (Stop Recovery): 60
    
    Adjustments:
      - Risk level: CRITICAL (+5 for Escalation, -10 for Retry); HIGH (+10 for Retry); LOW (-10 for Retry).
      - Time sensitivity: FRESH (+5 for Retry); STALE (-10 for Retry, +5 for Escalation/Stop).
      - Failure history: 0 attempts (+5 for Retry); >0 failed attempts (-10 for Retry, +10 for Escalation/Stop).
      - Guardrail status: If blocked (+10 for Escalation/Stop alternative).
      
    Clamped between 0 and 100.
    """
    # 1. Base Confidence
    if action_type == RecoveryActionType.RETRY_PAYMENT:
        if case.risk_level == RiskLevel.HIGH and time_sensitivity_category == "FRESH":
            base = 90
        else:
            base = 75
    elif action_type == RecoveryActionType.ESCALATE_TO_HUMAN:
        base = 75
    else: # STOP_RECOVERY
        base = 60
        
    adjustments = 0
    
    # 2. Risk Adjustments
    if case.risk_level == RiskLevel.CRITICAL:
        if action_type == RecoveryActionType.ESCALATE_TO_HUMAN:
            adjustments += 5
        elif action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments -= 10
    elif case.risk_level == RiskLevel.HIGH:
        if action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments += 10
    elif case.risk_level == RiskLevel.LOW:
        if action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments -= 10
            
    # 3. Time Sensitivity Adjustments
    if time_sensitivity_category == "FRESH":
        if action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments += 5
    elif time_sensitivity_category == "STALE":
        if action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments -= 10
        else:
            adjustments += 5
            
    # 4. Failure History Adjustments
    if retry_attempts_count == 0:
        if action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments += 5
    else:
        if action_type == RecoveryActionType.RETRY_PAYMENT:
            adjustments -= 10
        else:
            adjustments += 10
            
    # 5. Guardrail Block Adjustments
    if not guardrail_result.is_allowed:
        if action_type != RecoveryActionType.RETRY_PAYMENT:
            adjustments += 10
            
    final_conf = base + adjustments
    return max(0, min(100, final_conf))

def generate_recommendation_reasons(
    case: RecoveryCase,
    action_type: RecoveryActionType,
    guardrail_result,
    retry_attempts_count: int,
    intel
) -> List[RecommendationReason]:
    """
    Produces deterministic, explainable reasons justifying the recommended recovery action.
    """
    reasons = []
    
    if action_type == RecoveryActionType.RETRY_PAYMENT:
        reasons.append(RecommendationReason(
            type="risk",
            message=f"Case assessed as {case.risk_level.value} risk failed payment with active recovery opportunity.",
            impact="positive"
        ))
        reasons.append(RecommendationReason(
            type="guardrail",
            message=f"Guardrails allow another retry attempt (attempt number {retry_attempts_count + 1}).",
            impact="positive"
        ))
        reasons.append(RecommendationReason(
            type="opportunity",
            message=f"Estimated recoverable amount of {intel.estimated_recoverable} INR is positive.",
            impact="positive"
        ))
        if intel.time_sensitivity.category == "FRESH":
            reasons.append(RecommendationReason(
                type="sensitivity",
                message="Case is still fresh, maximizing likelihood of transaction recovery.",
                impact="positive"
            ))
            
    elif action_type == RecoveryActionType.ESCALATE_TO_HUMAN:
        if case.risk_level == RiskLevel.CRITICAL:
            reasons.append(RecommendationReason(
                type="risk",
                message="Critical risk payment exceeds automated policies and requires manual intervention.",
                impact="positive"
            ))
        if not guardrail_result.is_allowed:
            reasons.append(RecommendationReason(
                type="guardrail",
                message=f"Retry payment is blocked by guardrails: {guardrail_result.reason}.",
                impact="negative"
            ))
        if retry_attempts_count >= 2:
            reasons.append(RecommendationReason(
                type="opportunity",
                message=f"Repeated retry failures ({retry_attempts_count} failed attempts) indicate low automated recovery opportunity.",
                impact="negative"
            ))
        if intel.time_sensitivity.category in ("AGING", "STALE"):
            reasons.append(RecommendationReason(
                type="sensitivity",
                message=f"Case age of {intel.time_sensitivity.hours_since_event:.1f} hours is aging/stale and requires human support.",
                impact="neutral"
            ))
            
    else: # STOP_RECOVERY
        if retry_attempts_count >= 3:
            reasons.append(RecommendationReason(
                type="guardrail",
                message="Recovery retry opportunity is fully exhausted (3 attempts reached).",
                impact="negative"
            ))
        if intel.estimated_recoverable == 0:
            reasons.append(RecommendationReason(
                type="opportunity",
                message="Heuristic estimated recoverable amount is zero.",
                impact="negative"
            ))
            
    return reasons

def get_recommendation_statistics(store, current_time: datetime) -> AutomationSummary:
    """
    Computes summary recommendation statistics across all open active cases.
    """
    recs = recommend_for_all_open_cases(store, current_time)
    
    retry_rec = 0
    escalate_rec = 0
    stop_rec = 0
    blocked_count = 0
    
    for r in recs:
        action = r.recommendation.recommended_action
        if action == RecoveryActionType.RETRY_PAYMENT:
            retry_rec += 1
        elif action == RecoveryActionType.ESCALATE_TO_HUMAN:
            escalate_rec += 1
        elif action == RecoveryActionType.STOP_RECOVERY:
            stop_rec += 1
            
        if r.recommendation.guardrail_status == "BLOCKED":
            blocked_count += 1
            
    return AutomationSummary(
        cases_evaluated=len(recs),
        retry_recommended=retry_rec,
        escalation_recommended=escalate_rec,
        stop_recommended=stop_rec,
        blocked_retry_count=blocked_count
    )

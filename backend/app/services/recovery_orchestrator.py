import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryActionType,
    RecoveryActionStatus,
    OrchestrationState,
    OrchestrationDecisionType
)
from app.store import MemoryStore
from app.services.strategy_optimizer import optimize_strategy
from app.services.audit import log_audit_event

def evaluate_orchestration(case_id: uuid.UUID, store: MemoryStore, current_time: datetime) -> OrchestrationState:
    """
    Evaluates an existing recovery case and returns a deterministic orchestration decision.
    Idempotent: Re-evaluating the same case state produces the same decision without duplicate side-effects.
    """
    case = store.recovery_cases.get(case_id)
    if not case:
        raise ValueError(f"Recovery case {case_id} not found")

    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
        
    merchant = store.merchants.get(case.merchant_id)
    cooldown_hours = getattr(merchant, "retry_cooldown_hours", 24) if merchant else 24
    max_retries = getattr(merchant, "max_retry_attempts", 3) if merchant else 3

    # Fetch actions history for attempt calculation
    existing_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
    retry_actions = [
        a for a in existing_actions 
        if a.action_type == RecoveryActionType.RETRY_PAYMENT and a.status != RecoveryActionStatus.BLOCKED
    ]
    retry_actions.sort(key=lambda x: x.created_at, reverse=True)
    attempt_number = len(retry_actions) + 1
    
    # 1. State Terminal checks
    if case.status == RecoveryCaseStatus.RECOVERED:
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.ALREADY_RECOVERED, "NO_INTERVENTION", None, None, attempt_number, False,
            "Case is already recovered. No further orchestration required.", False, current_time, store
        )

    if case.status == RecoveryCaseStatus.STOPPED:
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.STOP_RECOVERY, "NO_INTERVENTION", None, None, attempt_number, False,
            "Case is stopped. No further execution allowed.", False, current_time, store
        )

    # 2. Expiration Check (e.g. 30 days)
    if (current_time - case.created_at).total_seconds() > 30 * 86400:
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.CASE_EXPIRED, "NO_INTERVENTION", None, None, attempt_number, False,
            "Case has expired after 30 days.", False, current_time, store
        )
        
    # 3. Maximum attempts exhausted
    if attempt_number > max_retries:
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.ESCALATE_TO_HUMAN, "ESCALATE_TO_HUMAN", RecoveryActionType.ESCALATE_TO_HUMAN, None, attempt_number, False,
            "Maximum retry attempts exhausted. Escalation required.", True, current_time, store
        )
        
    # 4. Strategy Optimization
    opt_res = optimize_strategy(store, case, current_time)
    selected = opt_res.recommended_strategy
    
    # 5. Decision Tree
    if selected == "NO_INTERVENTION":
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.STOP_RECOVERY, selected, RecoveryActionType.STOP_RECOVERY, None, attempt_number, False,
            "Strategy optimizer recommends NO_INTERVENTION.", False, current_time, store
        )
        
    if selected == "ESCALATE_TO_HUMAN":
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.ESCALATE_TO_HUMAN, selected, RecoveryActionType.ESCALATE_TO_HUMAN, None, attempt_number, False,
            "Strategy optimizer recommends human escalation.", True, current_time, store
        )

    if selected == "ALTERNATE_PAYMENT":
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.EXECUTE_NOW, selected, RecoveryActionType.OFFER_ALTERNATIVE_METHOD, None, attempt_number, False,
            "Strategy optimizer recommends alternate payment method.", False, current_time, store
        )
        
    if selected == "IMMEDIATE_RETRY":
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.EXECUTE_NOW, selected, RecoveryActionType.RETRY_PAYMENT, None, attempt_number, False,
            "Strategy optimizer recommends immediate retry.", False, current_time, store
        )
        
    if selected == "DELAYED_RETRY":
        scheduled_time = None
        cooldown_active = False
        reason = "Strategy optimizer recommends delayed retry."
        if retry_actions:
            last_retry = retry_actions[0]
            cooldown_expiry = last_retry.created_at + timedelta(hours=cooldown_hours)
            if cooldown_expiry > current_time:
                cooldown_active = True
                scheduled_time = cooldown_expiry
                reason = f"Cooldown active. Retry scheduled after {cooldown_expiry.isoformat()}."
                return _build_and_log_state(
                    case_id, OrchestrationDecisionType.WAIT_COOLDOWN, selected, RecoveryActionType.RETRY_PAYMENT, scheduled_time, attempt_number, cooldown_active,
                    reason, False, current_time, store
                )
        
        return _build_and_log_state(
            case_id, OrchestrationDecisionType.SCHEDULE_RETRY, selected, RecoveryActionType.RETRY_PAYMENT, current_time + timedelta(hours=cooldown_hours), attempt_number, cooldown_active,
            "Scheduling next retry attempt.", False, current_time, store
        )

    # Fallback
    return _build_and_log_state(
        case_id, OrchestrationDecisionType.REEVALUATE, selected, None, None, attempt_number, False,
        "Re-evaluation needed. No clear path.", False, current_time, store
    )

def _build_and_log_state(
    case_id: uuid.UUID,
    decision: OrchestrationDecisionType,
    selected_strategy: str,
    next_action: Optional[RecoveryActionType],
    scheduled_time: Optional[datetime],
    attempt_number: int,
    cooldown_active: bool,
    reason: str,
    human_escalation_required: bool,
    evaluated_at: datetime,
    store: MemoryStore
) -> OrchestrationState:
    state = OrchestrationState(
        case_id=case_id,
        decision=decision,
        selected_strategy=selected_strategy,
        next_action=next_action,
        scheduled_time=scheduled_time,
        attempt_number=attempt_number,
        cooldown_active=cooldown_active,
        reason=reason,
        human_escalation_required=human_escalation_required,
        evaluated_at=evaluated_at
    )
    
    # Check idempotency to prevent duplicate audit logs for the exact same orchestration evaluation
    action_type = f"ORCHESTRATION_{decision.value}"
    
    # Find last orchestration log for this case
    case_logs = [log for log in store.audit_logs if log.recovery_case_id == case_id and log.action.startswith("ORCHESTRATION_")]
    if case_logs:
        case_logs.sort(key=lambda x: x.created_at, reverse=True)
        last_log = case_logs[0]
        # If the same decision, reason, and attempt number exist, don't spam the logs
        if (last_log.action == action_type and 
            last_log.details.get("reason") == reason and 
            last_log.details.get("attempt_number") == attempt_number):
            return state

    # Otherwise, write the audit log
    details = state.model_dump(mode='json')
    # Use evaluated_at as strings in details for JSON serialization in tests sometimes, but Pydantic dump handles it.
    
    log_audit_event(case_id, "SYSTEM", action_type, details)
    
    return state

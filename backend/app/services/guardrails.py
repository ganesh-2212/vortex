from datetime import datetime
from typing import List
from app.models.domain import (
    RecoveryAction,
    RecoveryActionStatus,
    RecoveryActionType,
    RecoveryCase,
    RecoveryCaseStatus,
)

class GuardrailResult:
    def __init__(self, is_allowed: bool, reason: str):
        self.is_allowed = is_allowed
        self.reason = reason

def evaluate_guardrails(
    case: RecoveryCase,
    action_type: RecoveryActionType,
    attempt_number: int,
    existing_actions: List[RecoveryAction],
    current_time: datetime
) -> GuardrailResult:
    """
    Evaluates whether a proposed action is allowed under the deterministic guardrails.
    """
    
    # 1. Never allow an action after a case is RECOVERED
    if case.status == RecoveryCaseStatus.RECOVERED:
        return GuardrailResult(
            is_allowed=False,
            reason="Case is already RECOVERED. No further actions allowed."
        )

    # 2. Never allow an action after a case is STOPPED
    # EXCEPT ESCALATE_TO_HUMAN or STOP_RECOVERY
    if case.status == RecoveryCaseStatus.STOPPED:
        if action_type not in (RecoveryActionType.ESCALATE_TO_HUMAN, RecoveryActionType.STOP_RECOVERY):
            return GuardrailResult(
                is_allowed=False,
                reason="Case is already STOPPED. Only ESCALATE_TO_HUMAN or STOP_RECOVERY are allowed."
            )

    # Load merchant configuration settings
    from app.store import store
    merchant = store.merchants.get(case.merchant_id)
    recovery_enabled = True
    max_retries = 3
    cooldown_hours = 24
    supported_actions = ["RETRY_PAYMENT", "ESCALATE_TO_HUMAN", "STOP_RECOVERY", "SEND_REMINDER", "OFFER_ALTERNATIVE_METHOD"]

    if merchant:
        recovery_enabled = getattr(merchant, "recovery_enabled", True)
        max_retries = getattr(merchant, "max_retry_attempts", 3)
        cooldown_hours = getattr(merchant, "retry_cooldown_hours", 24)
        raw_actions = getattr(merchant, "supported_recovery_actions", [])
        if raw_actions:
            supported_actions = raw_actions

    if not recovery_enabled:
        return GuardrailResult(
            is_allowed=False,
            reason="Recovery processes are globally disabled for this merchant"
        )

    if action_type.value not in supported_actions:
        return GuardrailResult(
            is_allowed=False,
            reason=f"Action {action_type.value} is not enabled in merchant recovery settings"
        )
    # 3. STOP_RECOVERY is always allowed (unless case is RECOVERED, checked above)
    if action_type == RecoveryActionType.STOP_RECOVERY:
        return GuardrailResult(
            is_allowed=True,
            reason="STOP_RECOVERY is always allowed"
        )

    # 4. ESCALATE_TO_HUMAN is always allowed unless case is RECOVERED (checked above)
    if action_type == RecoveryActionType.ESCALATE_TO_HUMAN:
        return GuardrailResult(
            is_allowed=True,
            reason="ESCALATE_TO_HUMAN is always allowed unless case is RECOVERED"
        )

    # 5. RETRY_PAYMENT rules:
    if action_type == RecoveryActionType.RETRY_PAYMENT:
        # Filter existing non-blocked retry actions
        retry_actions = [
            a for a in existing_actions
            if a.action_type == RecoveryActionType.RETRY_PAYMENT
            and a.status != RecoveryActionStatus.BLOCKED
        ]
        
        retry_count = len(retry_actions)

        # Rule: maximum retry attempts
        if retry_count >= max_retries:
            return GuardrailResult(
                is_allowed=False,
                reason="Maximum retry attempts reached"
            )

        if attempt_number > max_retries:
            return GuardrailResult(
                is_allowed=False,
                reason="Maximum retry attempts reached"
            )

        # Rule: minimum cooldown between retry attempts
        if retry_count > 0:
            # Sort retry actions by creation time descending to find the last attempt
            retry_actions.sort(key=lambda x: x.created_at, reverse=True)
            last_retry = retry_actions[0]
            
            time_diff = current_time - last_retry.created_at
            if time_diff.total_seconds() < cooldown_hours * 3600:
                # Calculate hours remaining for clarity
                remaining_seconds = cooldown_hours * 3600 - time_diff.total_seconds()
                remaining_hours = remaining_seconds / 3600
                return GuardrailResult(
                    is_allowed=False,
                    reason=f"Retry blocked: Cooldown active. Try again in {remaining_hours:.1f} hours."
                )

        next_attempt = retry_count + 1
        return GuardrailResult(
            is_allowed=True,
            reason=f"Retry attempt {next_attempt} of maximum {max_retries} allowed attempts"
        )

    # 6. Default allowance for other actions
    return GuardrailResult(
        is_allowed=True,
        reason=f"Action {action_type.value} is permitted under current guardrails"
    )

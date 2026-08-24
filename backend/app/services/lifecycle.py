import uuid
from decimal import Decimal
from typing import List, Optional
from datetime import datetime

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionStatus,
    RecoveryActionType,
    RecoveryAttempt,
    RecoveryOutcome,
    RecoveryLifecycle,
    RecoveryOutcomeSummary
)

def get_case_attempts(store, case_id: uuid.UUID) -> List[RecoveryAttempt]:
    """
    Returns a chronological list of recovery attempts for a specific case.
    """
    if case_id not in store.recovery_cases:
        return []
        
    case = store.recovery_cases[case_id]
    
    # Filter actions belonging to this case
    actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case_id]
    
    # Sort chronologically by creation timestamp
    actions.sort(key=lambda x: x.created_at)
    
    attempts = []
    for action in actions:
        amount_attempted = Decimal("0.00")
        amount_recovered = Decimal("0.00")
        
        if action.action_type == RecoveryActionType.RETRY_PAYMENT:
            amount_attempted = case.amount_at_risk
            if action.status == RecoveryActionStatus.EXECUTED:
                amount_recovered = case.amount_at_risk
                
        failure_reason = None
        if action.status == RecoveryActionStatus.FAILED:
            failure_reason = action.result.get("error_code") or "Transaction failed"
        elif action.status == RecoveryActionStatus.BLOCKED:
            failure_reason = action.reason or "Blocked by guardrails"
            
        attempts.append(RecoveryAttempt(
            case_id=case_id,
            action_id=action.id,
            attempt_number=action.attempt_number,
            action_type=action.action_type,
            status=action.status,
            amount_attempted=amount_attempted,
            amount_recovered=amount_recovered,
            provider_transaction_id=action.result.get("transaction_id") if action.result else None,
            executed_timestamp=action.executed_at,
            failure_reason=failure_reason
        ))
        
    return attempts

def get_case_lifecycle(store, case_id: uuid.UUID) -> Optional[RecoveryLifecycle]:
    """
    Computes and returns the complete recovery lifecycle details of a case.
    """
    if case_id not in store.recovery_cases:
        return None
        
    case = store.recovery_cases[case_id]
    attempts = get_case_attempts(store, case_id)
    
    # Filter retry actions to calculate attempt counts
    retry_attempts = [a for a in attempts if a.action_type == RecoveryActionType.RETRY_PAYMENT]
    
    total_attempts = len(retry_attempts)
    successful_attempts = sum(1 for a in retry_attempts if a.status == RecoveryActionStatus.EXECUTED)
    failed_attempts = sum(1 for a in retry_attempts if a.status == RecoveryActionStatus.FAILED)
    
    # Find execution timestamps
    executed_times = [a.executed_timestamp for a in attempts if a.executed_timestamp is not None]
    
    first_attempt_timestamp = None
    last_attempt_timestamp = None
    if executed_times:
        executed_times.sort()
        first_attempt_timestamp = executed_times[0]
        last_attempt_timestamp = executed_times[-1]
        
    # Calculate duration for resolved recovered cases
    recovery_duration_seconds = None
    if case.status == RecoveryCaseStatus.RECOVERED and case.recovered_at is not None:
        recovery_duration_seconds = (case.recovered_at - case.created_at).total_seconds()
        
    return RecoveryLifecycle(
        case_id=case_id,
        current_status=case.status,
        total_attempts=total_attempts,
        successful_attempts=successful_attempts,
        failed_attempts=failed_attempts,
        actual_recovered_amount=case.recovered_amount,
        first_attempt_timestamp=first_attempt_timestamp,
        last_attempt_timestamp=last_attempt_timestamp,
        recovery_duration_seconds=recovery_duration_seconds,
        final_outcome=case.outcome
    )

def get_case_actual_recovered(store, case_id: uuid.UUID) -> Decimal:
    """
    Returns the actual confirmed recovered amount for a case.
    """
    if case_id not in store.recovery_cases:
        return Decimal("0.00")
    return store.recovery_cases[case_id].recovered_amount

def get_case_outcome(store, case_id: uuid.UUID) -> Optional[RecoveryOutcome]:
    """
    Returns the final outcome details of a case.
    """
    if case_id not in store.recovery_cases:
        return None
        
    case = store.recovery_cases[case_id]
    
    recovery_duration_seconds = None
    if case.status == RecoveryCaseStatus.RECOVERED and case.recovered_at is not None:
        recovery_duration_seconds = (case.recovered_at - case.created_at).total_seconds()
        
    return RecoveryOutcome(
        case_id=case_id,
        status=case.status,
        outcome=case.outcome,
        actual_recovered_amount=case.recovered_amount,
        recovered_at=case.recovered_at,
        provider_transaction_id=case.provider_transaction_id,
        recovery_duration_seconds=recovery_duration_seconds
    )

def get_recovery_statistics(store) -> RecoveryOutcomeSummary:
    """
    Calculates operational and recovery statistics across all cases.
    """
    total_cases = len(store.recovery_cases)
    open_cases = sum(1 for c in store.recovery_cases.values() if c.status in (RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS))
    recovered_cases = sum(1 for c in store.recovery_cases.values() if c.status == RecoveryCaseStatus.RECOVERED)
    stopped_cases = sum(1 for c in store.recovery_cases.values() if c.status == RecoveryCaseStatus.STOPPED)
    escalated_cases = sum(1 for c in store.recovery_cases.values() if c.status == RecoveryCaseStatus.ESCALATED)
    
    total_amount_at_risk = sum(c.amount_at_risk for c in store.recovery_cases.values())
    actual_recovered_revenue = sum(c.recovered_amount for c in store.recovery_cases.values())
    
    # Calculate recovery rate based on actual resolved cases
    recovery_rate = 0.0
    if total_cases > 0:
        recovery_rate = (recovered_cases / total_cases) * 100.0
        
    # Count retries
    successful_retry_count = sum(
        1 for a in store.recovery_actions.values()
        if a.action_type == RecoveryActionType.RETRY_PAYMENT and a.status == RecoveryActionStatus.EXECUTED
    )
    failed_retry_count = sum(
        1 for a in store.recovery_actions.values()
        if a.action_type == RecoveryActionType.RETRY_PAYMENT and a.status == RecoveryActionStatus.FAILED
    )
    
    return RecoveryOutcomeSummary(
        total_cases=total_cases,
        open_cases=open_cases,
        recovered_cases=recovered_cases,
        stopped_cases=stopped_cases,
        escalated_cases=escalated_cases,
        total_amount_at_risk=total_amount_at_risk,
        actual_recovered_revenue=actual_recovered_revenue,
        recovery_rate=recovery_rate,
        successful_retry_count=successful_retry_count,
        failed_retry_count=failed_retry_count
    )

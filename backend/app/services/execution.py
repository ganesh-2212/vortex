from datetime import datetime, timezone
import uuid
from decimal import Decimal
from typing import Dict, Any

from app.models.domain import (
    RecoveryCase,
    RecoveryAction,
    RecoveryCaseStatus,
    RecoveryActionStatus,
    RecoveryActionType,
    RevenueEvent,
    RevenueEventType,
    ActionExecutionResponse,
    ProviderExecutionResult
)
from app.store import store
from app.services.guardrails import evaluate_guardrails
from app.services.audit import log_audit_event
from app.services.providers import MockPaymentProvider
from app.services.outcomes import (
    record_retry_success,
    record_retry_failure,
    record_stop_recovery,
    record_escalation
)

def execute_recovery_action(
    case: RecoveryCase,
    action: RecoveryAction,
    payload: Dict[str, Any]
) -> ActionExecutionResponse:
    """
    Executes a proposed recovery action after re-verifying guardrails,
    updates case/action states, registers payment retry events, and logs audits.
    """
    current_time = datetime.now(timezone.utc)
    
    # 1. Prevent execution of already executed/failed/blocked actions
    if action.status in (RecoveryActionStatus.EXECUTED, RecoveryActionStatus.FAILED, RecoveryActionStatus.BLOCKED, RecoveryActionStatus.CANCELLED):
        raise ValueError(f"Action cannot be executed. Current status: {action.status.value}")

    # 2. Re-check guardrails before execution
    existing_actions = [
        a for a in store.recovery_actions.values()
        if a.recovery_case_id == case.id and a.id != action.id
    ]
    
    guardrail_result = evaluate_guardrails(
        case=case,
        action_type=action.action_type,
        attempt_number=action.attempt_number,
        existing_actions=existing_actions,
        current_time=current_time
    )

    if not guardrail_result.is_allowed:
        action.status = RecoveryActionStatus.BLOCKED
        action.reason = f"Execution blocked: {guardrail_result.reason}"
        store.recovery_actions[action.id] = action
        
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="ACTION_BLOCKED",
            details={
                "action_type": action.action_type.value,
                "reason": action.reason,
                "attempt_number": action.attempt_number,
                "action_id": str(action.id)
            }
        )
        raise PermissionError(f"Guardrail check failed at execution: {guardrail_result.reason}")

    # 3. Log ACTION_EXECUTION_STARTED
    log_audit_event(
        recovery_case_id=case.id,
        actor_type="SYSTEM",
        action="ACTION_EXECUTION_STARTED",
        details={
            "action_type": action.action_type.value,
            "attempt_number": action.attempt_number,
            "action_id": str(action.id)
        }
    )

    # 4. Dispatch and Execute by Action Type
    if action.action_type == RecoveryActionType.RETRY_PAYMENT:
        # Provider Abstraction
        provider = MockPaymentProvider()
        provider_result = provider.execute_retry(
            amount=case.amount_at_risk,
            currency="INR",
            payload=payload
        )
        
        action.executed_at = current_time
        
        # Add a RevenueEvent recording this retry attempt to trigger cooldown / limit rules
        retry_event = RevenueEvent(
            id=uuid.uuid4(),
            merchant_id=case.merchant_id,
            customer_id=case.customer_id,
            event_type=RevenueEventType.PAYMENT_RETRY,
            amount=case.amount_at_risk,
            currency="INR",
            status="SUCCESS" if provider_result.success else "FAILED",
            occurred_at=current_time,
            metadata={
                "source": "retry_execution",
                "case_id": str(case.id),
                "action_id": str(action.id),
                "transaction_id": provider_result.transaction_id,
                "error_code": provider_result.error_code
            },
            created_at=current_time
        )
        store.revenue_events[retry_event.id] = retry_event

        if provider_result.success:
            action.status = RecoveryActionStatus.EXECUTED
            action.result = {
                "success": True,
                "transaction_id": provider_result.transaction_id,
                "provider_response": provider_result.raw_response
            }
            
            record_retry_success(case, provider_result.transaction_id, current_time)
            
            # Log successful execution and recovery
            log_audit_event(
                recovery_case_id=case.id,
                actor_type="SYSTEM",
                action="ACTION_EXECUTED",
                details={
                    "action_type": action.action_type.value,
                    "attempt_number": action.attempt_number,
                    "transaction_id": provider_result.transaction_id,
                    "action_id": str(action.id)
                }
            )
            log_audit_event(
                recovery_case_id=case.id,
                actor_type="SYSTEM",
                action="CASE_RECOVERED",
                details={
                    "reason": "Payment retry execution succeeded, recovery complete",
                    "transaction_id": provider_result.transaction_id,
                    "amount": float(case.amount_at_risk)
                }
            )
        else:
            action.status = RecoveryActionStatus.FAILED
            action.result = {
                "success": False,
                "error_code": provider_result.error_code,
                "provider_response": provider_result.raw_response
            }
            record_retry_failure(case, current_time)
            
            # Log failed execution
            log_audit_event(
                recovery_case_id=case.id,
                actor_type="SYSTEM",
                action="ACTION_EXECUTION_FAILED",
                details={
                    "action_type": action.action_type.value,
                    "attempt_number": action.attempt_number,
                    "error_code": provider_result.error_code,
                    "action_id": str(action.id)
                }
            )

    elif action.action_type == RecoveryActionType.STOP_RECOVERY:
        action.status = RecoveryActionStatus.EXECUTED
        action.executed_at = current_time
        action.result = {"message": "Recovery stopped successfully"}
        
        record_stop_recovery(case, current_time)
        
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="ACTION_EXECUTED",
            details={
                "action_type": action.action_type.value,
                "action_id": str(action.id)
            }
        )
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="CASE_STOPPED",
            details={"reason": "Recovery processes stopped manually"}
        )

    elif action.action_type == RecoveryActionType.ESCALATE_TO_HUMAN:
        action.status = RecoveryActionStatus.EXECUTED
        action.executed_at = current_time
        action.result = {"message": "Escalated to human support queue"}
        
        record_escalation(case, current_time)
        
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="ACTION_EXECUTED",
            details={
                "action_type": action.action_type.value,
                "action_id": str(action.id)
            }
        )
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="CASE_ESCALATED",
            details={"reason": "Case escalated to human queue for manual remediation"}
        )

    else:
        # Default fallback for other action types
        action.status = RecoveryActionStatus.EXECUTED
        action.executed_at = current_time
        action.result = {"message": f"Action {action.action_type.value} executed."}
        
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="ACTION_EXECUTED",
            details={
                "action_type": action.action_type.value,
                "action_id": str(action.id)
            }
        )

    # Save changes to the store
    store.recovery_actions[action.id] = action
    store.recovery_cases[case.id] = case

    return ActionExecutionResponse(
        action_id=action.id,
        action_type=action.action_type,
        status=action.status,
        executed_at=action.executed_at,
        result=action.result,
        updated_case_status=case.status
    )

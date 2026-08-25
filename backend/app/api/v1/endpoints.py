from datetime import datetime, timezone
from typing import List, Optional
import uuid
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Path, Body

from app.models.domain import (
    Merchant, MerchantCreate, MerchantConfigUpdate,
    Customer, CustomerCreate,
    RevenueEvent, RevenueEventCreate,
    RecoveryCase, RecoveryCaseDetailResponse,
    RecoveryAction, ProposedActionCreate, ActionEvaluationResponse,
    AuditLog,
    RevenueEventType, RecoveryCaseStatus,
    RecoveryActionStatus, RecoveryActionType,
    ActionExecutionRequest, ActionExecutionResponse
)
from app.store import store
from app.services.risk_engine import assess_risk
from app.services.guardrails import evaluate_guardrails
from app.services.audit import log_audit_event

router = APIRouter()

@router.post("/merchants", response_model=Merchant)
async def create_merchant(merchant_in: MerchantCreate):
    """
    Convenience endpoint to register a merchant.
    """
    merchant = Merchant(
        id=uuid.uuid4(),
        name=merchant_in.name,
        email=merchant_in.email,
        created_at=datetime.now(timezone.utc)
    )
    store.merchants[merchant.id] = merchant
    return merchant

@router.post("/customers", response_model=Customer)
async def create_customer(customer_in: CustomerCreate):
    """
    Convenience endpoint to register a customer.
    """
    if customer_in.merchant_id not in store.merchants:
        raise HTTPException(status_code=400, detail="Merchant not found")
        
    customer = Customer(
        id=uuid.uuid4(),
        merchant_id=customer_in.merchant_id,
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        created_at=datetime.now(timezone.utc)
    )
    store.customers[customer.id] = customer
    return customer

@router.post("/revenue-events", response_model=RevenueEvent)
async def create_revenue_event(event_in: RevenueEventCreate):
    """
    Creates a revenue event. Triggers deterministic recovery case creation
    or completes existing cases on success events.
    """
    # Verify merchant exists
    if event_in.merchant_id not in store.merchants:
        raise HTTPException(status_code=400, detail="Merchant not found")
    
    # Verify customer exists if provided
    if event_in.customer_id and event_in.customer_id not in store.customers:
        raise HTTPException(status_code=400, detail="Customer not found")
        
    event = RevenueEvent(
        id=uuid.uuid4(),
        merchant_id=event_in.merchant_id,
        customer_id=event_in.customer_id,
        event_type=event_in.event_type,
        amount=event_in.amount,
        currency=event_in.currency,
        status=event_in.status,
        occurred_at=event_in.occurred_at,
        metadata=event_in.metadata,
        created_at=datetime.now(timezone.utc)
    )
    store.revenue_events[event.id] = event
    
    # Handle recovery case triggers
    failure_types = {
        RevenueEventType.PAYMENT_FAILED,
        RevenueEventType.SUBSCRIPTION_FAILED,
        RevenueEventType.INVOICE_OVERDUE,
        RevenueEventType.CHECKOUT_ABANDONED
    }
    
    if event.event_type in failure_types:
        # Determine existing failures count for this customer
        existing_failures = 0
        if event.customer_id:
            existing_failures = sum(
                1 for e in store.revenue_events.values()
                if e.customer_id == event.customer_id
                and e.event_type in failure_types
                and e.id != event.id
            )
            
        # Determine retry attempt count
        retry_count = 0
        if event.customer_id:
            retry_count = sum(
                1 for e in store.revenue_events.values()
                if e.customer_id == event.customer_id
                and e.event_type == RevenueEventType.PAYMENT_RETRY
            )
            
        risk_result = assess_risk(event, existing_failures, retry_count)
        
        # Create Recovery Case
        case = RecoveryCase(
            id=uuid.uuid4(),
            merchant_id=event.merchant_id,
            customer_id=event.customer_id,
            revenue_event_id=event.id,
            amount_at_risk=event.amount,
            risk_level=risk_result.risk_level,
            risk_reason=risk_result.reason,
            status=RecoveryCaseStatus.OPEN,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        store.recovery_cases[case.id] = case
        
        # Log case creation to audit trail
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="CASE_CREATED",
            details={
                "risk_level": risk_result.risk_level.value,
                "reason": risk_result.reason,
                "signals": {k: str(v) if isinstance(v, Decimal) else v for k, v in risk_result.signals.items()},
                "amount": float(event.amount),
                "event_id": str(event.id)
            }
        )
        
    elif event.event_type == RevenueEventType.PAYMENT_SUCCESS:
        # Resolve active cases for this customer
        if event.customer_id:
            for case in store.recovery_cases.values():
                if case.customer_id == event.customer_id and case.status in (RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS):
                    case.status = RecoveryCaseStatus.RECOVERED
                    case.updated_at = event.occurred_at
                    
                    log_audit_event(
                        recovery_case_id=case.id,
                        actor_type="SYSTEM",
                        action="CASE_RECOVERED",
                        details={
                            "reason": "Payment succeeded, recovery complete",
                            "event_id": str(event.id),
                            "amount": float(event.amount)
                        }
                    )
                    
    return event

@router.get("/revenue-events", response_model=List[RevenueEvent])
async def list_revenue_events():
    """
    Returns all revenue events.
    """
    return list(store.revenue_events.values())

@router.get("/recovery-cases", response_model=List[RecoveryCase])
async def list_recovery_cases():
    """
    Returns all recovery cases.
    """
    return list(store.recovery_cases.values())

@router.get("/audit-logs", response_model=List[AuditLog])
async def list_audit_logs():
    """
    Returns all audit logs in the store chronologically.
    """
    logs = list(store.audit_logs)
    logs.sort(key=lambda x: x.created_at)
    return logs

@router.get("/recovery-cases/{case_id}", response_model=RecoveryCaseDetailResponse)
async def get_recovery_case(case_id: uuid.UUID = Path(...)):
    """
    Returns a recovery case including associated actions and audit history.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    case = store.recovery_cases[case_id]
    
    # Filter actions and audit logs
    actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case_id]
    audit_history = [log for log in store.audit_logs if log.recovery_case_id == case_id]
    
    # Sort chronologically
    actions.sort(key=lambda x: x.created_at)
    audit_history.sort(key=lambda x: x.created_at)
    
    return RecoveryCaseDetailResponse(
        case=case,
        actions=actions,
        audit_history=audit_history
    )

@router.post("/recovery-cases/{case_id}/actions", response_model=ActionEvaluationResponse)
async def propose_recovery_action(
    case_id: uuid.UUID = Path(...),
    action_in: ProposedActionCreate = Body(...)
):
    """
    Accepts a proposed recovery action, evaluates it against deterministic guardrails,
    records the proposal and result in the audit trail, and returns whether it is ALLOWED or BLOCKED.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    case = store.recovery_cases[case_id]
    current_time = datetime.now(timezone.utc)
    
    # 1. Audit Action Proposed
    log_audit_event(
        recovery_case_id=case_id,
        actor_type="MERCHANT",
        action="ACTION_PROPOSED",
        details={
            "action_type": action_in.action_type.value,
            "proposed_reason": action_in.reason,
            "attempt_number": action_in.attempt_number
        }
    )
    
    # Load existing actions for guardrail evaluation
    existing_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case_id]
    
    # Calculate attempt number if not provided
    attempt_number = action_in.attempt_number
    if not attempt_number:
        retry_count = sum(
            1 for a in existing_actions
            if a.action_type == RecoveryActionType.RETRY_PAYMENT
            and a.status != RecoveryActionStatus.BLOCKED
        )
        if action_in.action_type == RecoveryActionType.RETRY_PAYMENT:
            attempt_number = retry_count + 1
        else:
            attempt_number = 1
            
    # 2. Evaluate guardrails
    guardrail_result = evaluate_guardrails(
        case=case,
        action_type=action_in.action_type,
        attempt_number=attempt_number,
        existing_actions=existing_actions,
        current_time=current_time
    )
    
    status = RecoveryActionStatus.ALLOWED if guardrail_result.is_allowed else RecoveryActionStatus.BLOCKED
    
    # 3. Create recovery action record
    action_record = RecoveryAction(
        id=uuid.uuid4(),
        recovery_case_id=case_id,
        action_type=action_in.action_type,
        status=status,
        attempt_number=attempt_number,
        reason=guardrail_result.reason,
        result={"detail": f"Action evaluation: {status.value}"},
        created_at=current_time
    )
    store.recovery_actions[action_record.id] = action_record
    
    # Update case status if ALLOWED
    if guardrail_result.is_allowed:
        if action_in.action_type == RecoveryActionType.STOP_RECOVERY:
            case.status = RecoveryCaseStatus.STOPPED
        elif action_in.action_type == RecoveryActionType.ESCALATE_TO_HUMAN:
            case.status = RecoveryCaseStatus.ESCALATED
        elif case.status == RecoveryCaseStatus.OPEN:
            case.status = RecoveryCaseStatus.IN_PROGRESS
            
        case.updated_at = current_time
        
    # 4. Audit Decision Result (Allowed or Blocked)
    log_audit_event(
        recovery_case_id=case_id,
        actor_type="SYSTEM",
        action="ACTION_ALLOWED" if guardrail_result.is_allowed else "ACTION_BLOCKED",
        details={
            "action_type": action_in.action_type.value,
            "reason": guardrail_result.reason,
            "attempt_number": attempt_number,
            "action_id": str(action_record.id)
        }
    )
    
    return ActionEvaluationResponse(
        action=action_in.action_type,
        status=status,
        reason=guardrail_result.reason
    )

@router.post(
    "/recovery-cases/{case_id}/actions/{action_id}/execute",
    response_model=ActionExecutionResponse
)
async def execute_case_action(
    case_id: uuid.UUID = Path(...),
    action_id: uuid.UUID = Path(...),
    req_in: ActionExecutionRequest = Body(...)
):
    """
    Executes an allowed recovery action after verifying guardrails.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    case = store.recovery_cases[case_id]

    if action_id not in store.recovery_actions:
        raise HTTPException(status_code=404, detail="Recovery action not found")

    action = store.recovery_actions[action_id]

    if action.recovery_case_id != case_id:
        raise HTTPException(status_code=400, detail="Action does not belong to this recovery case")

    try:
        from app.services.execution import execute_recovery_action
        result = execute_recovery_action(case, action, req_in.payload)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/merchants/{merchant_id}/config", response_model=Merchant)
async def get_merchant_config(merchant_id: uuid.UUID = Path(...)):
    """
    Returns the merchant configuration settings.
    """
    if merchant_id not in store.merchants:
        if merchant_id == uuid.UUID("11111111-1111-1111-1111-111111111111"):
            store.merchants[merchant_id] = Merchant(
                id=merchant_id,
                name="Acme Corp",
                email="acme@corp.com",
                created_at=datetime.now(timezone.utc)
            )
        else:
            raise HTTPException(status_code=404, detail="Merchant not found")
    return store.merchants[merchant_id]


@router.put("/merchants/{merchant_id}/config", response_model=Merchant)
async def update_merchant_config(
    merchant_id: uuid.UUID = Path(...),
    config_in: MerchantConfigUpdate = Body(...)
):
    """
    Updates the merchant configuration settings under strict validations.
    """
    if merchant_id not in store.merchants:
        raise HTTPException(status_code=404, detail="Merchant not found")

    # Validation constraints
    if config_in.max_retry_attempts < 0 or config_in.max_retry_attempts > 10:
        raise HTTPException(status_code=400, detail="max_retry_attempts must be between 0 and 10")

    if config_in.retry_cooldown_hours < 0 or config_in.retry_cooldown_hours > 720:
        raise HTTPException(status_code=400, detail="retry_cooldown_hours must be between 0 and 720")

    # Valid recovery action check
    valid_actions = {"RETRY_PAYMENT", "ESCALATE_TO_HUMAN", "STOP_RECOVERY", "SEND_REMINDER"}
    for act in config_in.supported_recovery_actions:
        if act not in valid_actions:
            raise HTTPException(status_code=400, detail=f"Invalid supported recovery action: {act}")

    merchant = store.merchants[merchant_id]

    # Update config properties
    merchant.recovery_enabled = config_in.recovery_enabled
    merchant.max_retry_attempts = config_in.max_retry_attempts
    merchant.retry_cooldown_hours = config_in.retry_cooldown_hours
    merchant.supported_recovery_actions = config_in.supported_recovery_actions
    merchant.escalation_behavior = config_in.escalation_behavior
    merchant.webhook_status = config_in.webhook_status

    # Log audit event
    log_audit_event(
        recovery_case_id=None,
        actor_type="MERCHANT",
        action="CONFIG_UPDATED",
        details={
            "recovery_enabled": config_in.recovery_enabled,
            "max_retry_attempts": config_in.max_retry_attempts,
            "retry_cooldown_hours": config_in.retry_cooldown_hours,
            "supported_recovery_actions": config_in.supported_recovery_actions,
            "escalation_behavior": config_in.escalation_behavior,
            "webhook_status": config_in.webhook_status
        }
    )

    return merchant


@router.get("/provider-info")
async def get_provider_info():
    """
    Returns the configured provider mode and environment status.
    """
    from app.config import settings
    return {
        "mode": settings.PAYMENT_PROVIDER_MODE,
        "key_id": settings.RAZORPAY_KEY_ID,
        "configured": bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)
    }

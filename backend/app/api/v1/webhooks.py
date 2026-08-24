from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import hmac
import uuid
from typing import Optional
from fastapi import APIRouter, Header, Request, HTTPException, Query

from app.config import settings
from app.models.domain import (
    RevenueEvent,
    RevenueEventType,
    RecoveryCase,
    RecoveryCaseStatus,
    Merchant,
    Customer,
)
from app.store import store
from app.services.risk_engine import assess_risk
from app.services.audit import log_audit_event

router = APIRouter()

@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    merchant_id: Optional[uuid.UUID] = Query(None)
):
    """
    Ingests, validates, and processes Razorpay payment webhook notifications.
    """
    # 1. Verify header exists
    if not x_razorpay_signature:
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_FAILED",
            details={"reason": "Missing X-Razorpay-Signature header"}
        )
        raise HTTPException(status_code=400, detail="Missing signature header")

    # 2. Read raw request body
    body = await request.body()

    # 3. Signature verification
    computed = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed, x_razorpay_signature):
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_FAILED",
            details={"reason": "Invalid signature. Verification failed."}
        )
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # 4. Parse payload
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_name = payload.get("event")
    if not event_name:
        raise HTTPException(status_code=400, detail="Missing event field")

    # Determine supported event types
    supported_events = {"payment.failed", "payment.captured"}
    if event_name not in supported_events:
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_UNHANDLED",
            details={"event": event_name, "reason": "Ignored unsupported event type"}
        )
        return {"status": "ignored", "reason": f"unsupported event type: {event_name}"}

    # Extract payment entity
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    payment_id = payment_entity.get("id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="Malformed payload: missing payment ID")

    # Map to internal RevenueEventType
    if event_name == "payment.failed":
        mapped_type = RevenueEventType.PAYMENT_FAILED
        status = "FAILED"
    else:
        mapped_type = RevenueEventType.PAYMENT_SUCCESS
        status = "SUCCESS"

    # 5. Idempotency check: event type + payment ID
    existing_event = None
    for ev in store.revenue_events.values():
        if ev.metadata.get("razorpay_payment_id") == payment_id and ev.event_type == mapped_type:
            existing_event = ev
            break

    if existing_event:
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_DUPLICATE",
            details={"payment_id": payment_id, "event_type": mapped_type.value}
        )
        return {"status": "duplicate", "message": "Event already processed"}

    # 6. Resolve merchant
    m_id = merchant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")
    if m_id not in store.merchants:
        # Stub the merchant if not seeded to prevent ingestion failure
        store.merchants[m_id] = Merchant(
            id=m_id,
            name="Auto Stub Merchant",
            email="merchant@stub.com",
            created_at=datetime.now(timezone.utc)
        )

    # 7. Resolve customer (matching email or contact)
    email = payment_entity.get("email")
    contact = payment_entity.get("contact")
    
    customer_id = None
    for c in store.customers.values():
        if c.merchant_id == m_id and (
            (email and c.email == email) or (contact and c.phone == contact)
        ):
            customer_id = c.id
            break

    if not customer_id:
        # Auto-create customer stub
        customer_id = uuid.uuid4()
        name = payment_entity.get("notes", {}).get("customer_name")
        if not name:
            name = email.split('@')[0] if email else "Webhook Customer"
            
        store.customers[customer_id] = Customer(
            id=customer_id,
            merchant_id=m_id,
            name=name,
            email=email,
            phone=contact,
            created_at=datetime.now(timezone.utc)
        )

    # 8. Convert amount (paise to Decimal INR)
    raw_amount = payment_entity.get("amount", 0)
    amount = Decimal(str(raw_amount)) / Decimal("100")
    currency = payment_entity.get("currency", "INR")

    # Time occurred
    occurred_at_ts = payment_entity.get("created_at")
    if occurred_at_ts:
        occurred_at = datetime.fromtimestamp(occurred_at_ts, timezone.utc)
    else:
        occurred_at = datetime.now(timezone.utc)

    # Create internal RevenueEvent
    event = RevenueEvent(
        id=uuid.uuid4(),
        merchant_id=m_id,
        customer_id=customer_id,
        event_type=mapped_type,
        amount=amount,
        currency=currency,
        status=status,
        occurred_at=occurred_at,
        metadata={
            "razorpay_payment_id": payment_id,
            "raw_payload": payload,
            "source": "razorpay_webhook"
        },
        created_at=datetime.now(timezone.utc)
    )
    store.revenue_events[event.id] = event

    case_id = None

    # Trigger recovery case creation or complete case on success
    failure_types = {
        RevenueEventType.PAYMENT_FAILED,
        RevenueEventType.SUBSCRIPTION_FAILED,
        RevenueEventType.INVOICE_OVERDUE,
        RevenueEventType.CHECKOUT_ABANDONED
    }

    if event.event_type in failure_types:
        # Determine existing failures count for this customer
        existing_failures = sum(
            1 for e in store.revenue_events.values()
            if e.customer_id == customer_id
            and e.event_type in failure_types
            and e.id != event.id
        )
        
        # Determine retry attempt count
        retry_count = sum(
            1 for e in store.revenue_events.values()
            if e.customer_id == customer_id
            and e.event_type == RevenueEventType.PAYMENT_RETRY
        )
        
        risk_result = assess_risk(event, existing_failures, retry_count)
        
        # Create Recovery Case
        case = RecoveryCase(
            id=uuid.uuid4(),
            merchant_id=m_id,
            customer_id=customer_id,
            revenue_event_id=event.id,
            amount_at_risk=event.amount,
            risk_level=risk_result.risk_level,
            risk_reason=risk_result.reason,
            status=RecoveryCaseStatus.OPEN,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        store.recovery_cases[case.id] = case
        case_id = case.id
        
        # Log case creation
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="CASE_CREATED",
            details={
                "risk_level": risk_result.risk_level.value,
                "reason": risk_result.reason,
                "amount": float(event.amount),
                "event_id": str(event.id),
                "source": "webhook"
            }
        )
        
    elif event.event_type == RevenueEventType.PAYMENT_SUCCESS:
        # Resolve active cases for this customer
        for case in store.recovery_cases.values():
            if case.customer_id == customer_id and case.status in (RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS):
                case.status = RecoveryCaseStatus.RECOVERED
                case.updated_at = event.occurred_at
                case_id = case.id
                
                log_audit_event(
                    recovery_case_id=case.id,
                    actor_type="SYSTEM",
                    action="CASE_RECOVERED",
                    details={
                        "reason": "Webhook payment success notification, recovery complete",
                        "event_id": str(event.id),
                        "amount": float(event.amount)
                    }
                )

    # 9. Audit event receipt
    log_audit_event(
        recovery_case_id=case_id,
        actor_type="SYSTEM",
        action="WEBHOOK_RECEIVED",
        details={
            "event": event_name,
            "payment_id": payment_id,
            "event_id": str(event.id)
        }
    )

    return {
        "status": "processed",
        "event_id": str(event.id),
        "case_id": str(case_id) if case_id else None
    }

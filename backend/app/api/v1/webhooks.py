from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import time
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
    WebhookSimulateRequest,
    WebhookSimulateResponse,
)
from app.store import store
from app.services.risk_engine import assess_risk
from app.services.audit import log_audit_event

router = APIRouter()

SUPPORTED_WEBHOOK_EVENTS = {"payment.failed", "payment.captured"}


def compute_razorpay_signature(body: bytes) -> str:
    return hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()


def verify_razorpay_signature(body: bytes, signature: str) -> None:
    computed = compute_razorpay_signature(body)
    if not hmac.compare_digest(computed, signature):
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_FAILED",
            details={"reason": "Invalid signature. Verification failed."},
        )
        raise HTTPException(status_code=400, detail="Invalid webhook signature")


def build_razorpay_webhook_payload(
    event: str,
    payment_id: str,
    amount_inr: Decimal,
    currency: str,
    email: str,
    contact: str,
) -> dict:
    amount_paise = int(amount_inr * 100)
    created_at = int(time.time())
    customer_name = email.split("@")[0] if email else "Webhook Customer"

    return {
        "entity": "event",
        "account_id": "acc_demo",
        "event": event,
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": amount_paise,
                    "currency": currency,
                    "email": email,
                    "contact": contact,
                    "created_at": created_at,
                    "notes": {"customer_name": customer_name},
                }
            }
        },
        "created_at": created_at,
    }


def process_razorpay_webhook_payload(
    payload: dict,
    merchant_id: Optional[uuid.UUID] = None,
) -> dict:
    """
    Shared Razorpay webhook ingestion pipeline used by both the live webhook
    endpoint and the local demo simulator.
    """
    event_name = payload.get("event")
    if not event_name:
        raise HTTPException(status_code=400, detail="Missing event field")

    if event_name not in SUPPORTED_WEBHOOK_EVENTS:
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_UNHANDLED",
            details={"event": event_name, "reason": "Ignored unsupported event type"},
        )
        return {"status": "ignored", "reason": f"unsupported event type: {event_name}"}

    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    payment_id = payment_entity.get("id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="Malformed payload: missing payment ID")

    if event_name == "payment.failed":
        mapped_type = RevenueEventType.PAYMENT_FAILED
        status = "FAILED"
    else:
        mapped_type = RevenueEventType.PAYMENT_SUCCESS
        status = "SUCCESS"

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
            details={"payment_id": payment_id, "event_type": mapped_type.value},
        )
        return {"status": "duplicate", "message": "Event already processed"}

    m_id = merchant_id or uuid.UUID("11111111-1111-1111-1111-111111111111")
    if m_id not in store.merchants:
        store.merchants[m_id] = Merchant(
            id=m_id,
            name="Auto Stub Merchant",
            email="merchant@stub.com",
            created_at=datetime.now(timezone.utc),
        )

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
        customer_id = uuid.uuid4()
        name = payment_entity.get("notes", {}).get("customer_name")
        if not name:
            name = email.split("@")[0] if email else "Webhook Customer"

        store.customers[customer_id] = Customer(
            id=customer_id,
            merchant_id=m_id,
            name=name,
            email=email,
            phone=contact,
            created_at=datetime.now(timezone.utc),
        )

    raw_amount = payment_entity.get("amount", 0)
    amount = Decimal(str(raw_amount)) / Decimal("100")
    currency = payment_entity.get("currency", "INR")

    occurred_at_ts = payment_entity.get("created_at")
    if occurred_at_ts:
        occurred_at = datetime.fromtimestamp(occurred_at_ts, timezone.utc)
    else:
        occurred_at = datetime.now(timezone.utc)

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
            "source": "razorpay_webhook",
        },
        created_at=datetime.now(timezone.utc),
    )
    store.revenue_events[event.id] = event

    case_id = None

    failure_types = {
        RevenueEventType.PAYMENT_FAILED,
        RevenueEventType.SUBSCRIPTION_FAILED,
        RevenueEventType.INVOICE_OVERDUE,
        RevenueEventType.CHECKOUT_ABANDONED,
    }

    if event.event_type in failure_types:
        existing_failures = sum(
            1
            for e in store.revenue_events.values()
            if e.customer_id == customer_id
            and e.event_type in failure_types
            and e.id != event.id
        )

        retry_count = sum(
            1
            for e in store.revenue_events.values()
            if e.customer_id == customer_id and e.event_type == RevenueEventType.PAYMENT_RETRY
        )

        risk_result = assess_risk(event, existing_failures, retry_count)

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
            updated_at=datetime.now(timezone.utc),
        )
        store.recovery_cases[case.id] = case
        case_id = case.id

        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="CASE_CREATED",
            details={
                "risk_level": risk_result.risk_level.value,
                "reason": risk_result.reason,
                "amount": float(event.amount),
                "event_id": str(event.id),
                "source": "webhook",
            },
        )

    elif event.event_type == RevenueEventType.PAYMENT_SUCCESS:
        for case in store.recovery_cases.values():
            if case.customer_id == customer_id and case.status in (
                RecoveryCaseStatus.OPEN,
                RecoveryCaseStatus.IN_PROGRESS,
            ):
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
                        "amount": float(event.amount),
                    },
                )

    log_audit_event(
        recovery_case_id=case_id,
        actor_type="SYSTEM",
        action="WEBHOOK_RECEIVED",
        details={
            "event": event_name,
            "payment_id": payment_id,
            "event_id": str(event.id),
        },
    )

    return {
        "status": "processed",
        "event_id": str(event.id),
        "case_id": str(case_id) if case_id else None,
        "event": event_name,
        "payment_id": payment_id,
        "amount": amount,
        "currency": currency,
    }


def ingest_signed_razorpay_webhook(
    body: bytes,
    signature: str,
    merchant_id: Optional[uuid.UUID] = None,
) -> dict:
    verify_razorpay_signature(body, signature)

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    return process_razorpay_webhook_payload(payload, merchant_id=merchant_id)


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    merchant_id: Optional[uuid.UUID] = Query(None),
):
    """
    Ingests, validates, and processes Razorpay payment webhook notifications.
    """
    if not x_razorpay_signature:
        log_audit_event(
            recovery_case_id=None,
            actor_type="SYSTEM",
            action="WEBHOOK_FAILED",
            details={"reason": "Missing X-Razorpay-Signature header"},
        )
        raise HTTPException(status_code=400, detail="Missing signature header")

    body = await request.body()
    result = ingest_signed_razorpay_webhook(body, x_razorpay_signature, merchant_id=merchant_id)
    return result


@router.post("/simulate", response_model=WebhookSimulateResponse)
async def simulate_webhook(
    request: WebhookSimulateRequest,
    merchant_id: Optional[uuid.UUID] = Query(None),
):
    """
    Local/demo-only helper that builds a Razorpay webhook payload, signs it with
    the configured webhook secret, and routes it through the same signed ingestion
    pipeline as the live webhook endpoint.
    """
    if settings.PAYMENT_PROVIDER_MODE != "mock":
        raise HTTPException(
            status_code=403,
            detail="Webhook simulator is only available when PAYMENT_PROVIDER_MODE=mock",
        )

    if request.event not in SUPPORTED_WEBHOOK_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported event type: {request.event}. Use payment.failed or payment.captured.",
        )

    payload = build_razorpay_webhook_payload(
        event=request.event,
        payment_id=request.payment_id,
        amount_inr=request.amount,
        currency=request.currency,
        email=request.email,
        contact=request.contact,
    )
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = compute_razorpay_signature(body)

    result = ingest_signed_razorpay_webhook(body, signature, merchant_id=merchant_id)

    amount = result.get("amount", request.amount)
    currency = result.get("currency", request.currency)

    return WebhookSimulateResponse(
        webhook_accepted=True,
        event=result.get("event", request.event),
        payment_id=result.get("payment_id", request.payment_id),
        amount=amount,
        currency=currency,
        result_status=result["status"],
        event_id=result.get("event_id"),
        case_id=result.get("case_id"),
        message=result.get("message") or result.get("reason"),
    )

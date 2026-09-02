from typing import Dict, List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.domain import (
    Merchant, Customer, RevenueEvent, RecoveryCase, RecoveryAction, AuditLog,
    RevenueEventType, RiskLevel, RecoveryCaseStatus, RecoveryActionType, RecoveryActionStatus
)

class MemoryStore:
    def __init__(self):
        self.merchants: Dict[uuid.UUID, Merchant] = {}
        self.customers: Dict[uuid.UUID, Customer] = {}
        self.revenue_events: Dict[uuid.UUID, RevenueEvent] = {}
        self.recovery_cases: Dict[uuid.UUID, RecoveryCase] = {}
        self.recovery_actions: Dict[uuid.UUID, RecoveryAction] = {}
        self.audit_logs: List[AuditLog] = []
        # F12 Simulation store is explicitly NOT seeded automatically to preserve ACTUAL vs SIMULATED boundary.
        self.simulations = {}
        self.latest_simulation = None
        
        # Razorpay Orders (order_id -> details)
        self.razorpay_orders: Dict[str, dict] = {}

    def clear(self):
        self.merchants.clear()
        self.customers.clear()
        self.revenue_events.clear()
        self.recovery_cases.clear()
        self.recovery_actions.clear()
        self.audit_logs.clear()
        self.simulations.clear()
        self.latest_simulation = None
        self.razorpay_orders.clear()

store = MemoryStore()

def seed_store(store_instance: MemoryStore = store, with_killer_scenario: bool = False):
    """
    Explicitly seeds the store instance with demo merchants, customers.
    If with_killer_scenario=True, injects a deterministic Killer Scenario representing actual application state.
    Idempotent: will not duplicate data on subsequent calls.
    DOES NOT run F12 simulations.
    """
    m_id = uuid.UUID("11111111-1111-1111-1111-111111111111")

    # If the first merchant exists, assume already seeded to prevent duplicate appends.
    if m_id in store_instance.merchants and not with_killer_scenario:
        return

    # 1. Merchant
    store_instance.merchants[m_id] = Merchant(
        id=m_id,
        name="Acme Corp",
        email="acme@corp.com",
        recovery_enabled=True,
        max_retry_attempts=3,
        retry_cooldown_hours=24,
        supported_recovery_actions=["RETRY_PAYMENT", "ESCALATE_TO_HUMAN", "STOP_RECOVERY", "SEND_REMINDER"]
    )

    if not with_killer_scenario:
        return

    now = datetime.now(timezone.utc)
    base_time = now - timedelta(days=2)

    def _create_customer(c_id: str, name: str, email: str) -> uuid.UUID:
        uid = uuid.UUID(c_id)
        if uid not in store_instance.customers:
            store_instance.customers[uid] = Customer(
                id=uid, merchant_id=m_id, name=name, email=email, phone="+910000000000"
            )
        return uid

    # Demo Customer IDs
    c1 = _create_customer("22222222-2222-2222-2222-222222222221", "Alice Smith", "alice@example.com")
    c2 = _create_customer("22222222-2222-2222-2222-222222222222", "Bob Jones", "bob@example.com")

    c3 = _create_customer("22222222-2222-2222-2222-222222222223", "Charlie Brown", "charlie@example.com")
    c4 = _create_customer("22222222-2222-2222-2222-222222222224", "Diana Prince", "diana@example.com")
    c5 = _create_customer("22222222-2222-2222-2222-222222222225", "Evan Wright", "evan@example.com")

    def _add_event_case_action(
        c_id: uuid.UUID,
        amount: str,
        risk_level: RiskLevel,
        case_status: RecoveryCaseStatus,
        actions: list, # List of tuples (ActionType, ActionStatus, timedelta_offset)
        recover_offset: Optional[int] = None
    ):
        event_id = uuid.uuid4()
        case_id = uuid.uuid4()

        # 1. Revenue Event (Failure)
        store_instance.revenue_events[event_id] = RevenueEvent(
            id=event_id, merchant_id=m_id, customer_id=c_id,
            event_type=RevenueEventType.PAYMENT_FAILED,
            amount=Decimal(amount), currency="INR", status="FAILED",
            occurred_at=base_time
        )

        # 2. Recovery Case
        store_instance.recovery_cases[case_id] = RecoveryCase(
            id=case_id, merchant_id=m_id, customer_id=c_id,
            revenue_event_id=event_id, amount_at_risk=Decimal(amount),
            risk_level=risk_level, risk_reason="Demo Scenario",
            status=case_status, created_at=base_time, updated_at=now
        )
        store_instance.audit_logs.append(AuditLog(
            id=uuid.uuid4(), recovery_case_id=case_id, actor_type="SYSTEM",
            action="CASE_CREATED", details={"reason": "Seeded"}, created_at=base_time
        ))

        # 3. Actions
        for act_type, act_status, offset_hours in actions:
            act_id = uuid.uuid4()
            act_time = base_time + timedelta(hours=offset_hours)
            store_instance.recovery_actions[act_id] = RecoveryAction(
                id=act_id, recovery_case_id=case_id, action_type=act_type,
                status=act_status, created_at=act_time, completed_at=act_time
            )
            store_instance.audit_logs.append(AuditLog(
                id=uuid.uuid4(), recovery_case_id=case_id, actor_type="SYSTEM",
                action="ACTION_EXECUTED", details={"type": act_type.value, "status": act_status.value}, created_at=act_time
            ))

        # 4. If Recovered, add a success event
        if recover_offset is not None:
            rec_time = base_time + timedelta(hours=recover_offset)
            rec_event_id = uuid.uuid4()
            store_instance.revenue_events[rec_event_id] = RevenueEvent(
                id=rec_event_id, merchant_id=m_id, customer_id=c_id,
                event_type=RevenueEventType.PAYMENT_SUCCESS,
                amount=Decimal(amount), currency="INR", status="SUCCESS",
                occurred_at=rec_time
            )
            store_instance.audit_logs.append(AuditLog(
                id=uuid.uuid4(), recovery_case_id=case_id, actor_type="SYSTEM",
                action="CASE_RECOVERED", details={"reason": "Payment success"}, created_at=rec_time
            ))

    # Only seed cases if they haven't been seeded yet
    if any(c.amount_at_risk == Decimal("50000.00") for c in store_instance.recovery_cases.values()):
        return

    # Scenario 1: ₹50,000 → Critical → Retry → Recovered
    _add_event_case_action(
        c1, "50000.00", RiskLevel.CRITICAL, RecoveryCaseStatus.RECOVERED,
        [(RecoveryActionType.RETRY_PAYMENT, RecoveryActionStatus.EXECUTED, 1)],
        recover_offset=2
    )

    # Scenario 2: ₹25,000 → High → Cooldown / Waiting (Retry recently executed)
    # Action happened 1 hour ago (47 hours after base_time)
    _add_event_case_action(
        c2, "25000.00", RiskLevel.HIGH, RecoveryCaseStatus.OPEN,
        [(RecoveryActionType.RETRY_PAYMENT, RecoveryActionStatus.EXECUTED, 47)]
    )

    # Scenario 3: ₹15,000 → High → Human Escalation
    _add_event_case_action(
        c3, "15000.00", RiskLevel.HIGH, RecoveryCaseStatus.IN_PROGRESS,
        [(RecoveryActionType.ESCALATE_TO_HUMAN, RecoveryActionStatus.EXECUTED, 5)]
    )

    # Scenario 4: ₹8,000 → Medium → Retry → Recovered
    _add_event_case_action(
        c4, "8000.00", RiskLevel.MEDIUM, RecoveryCaseStatus.RECOVERED,
        [(RecoveryActionType.RETRY_PAYMENT, RecoveryActionStatus.EXECUTED, 2)],
        recover_offset=3
    )

    if not any(c.amount_at_risk == Decimal("60000.00") for c in store_instance.recovery_cases.values()):
        # Scenario 5: ₹60,000 → Critical → Guardrail Blocked / Stopped (Retried 3 times previously)
        _add_event_case_action(
            c5, "60000.00", RiskLevel.CRITICAL, RecoveryCaseStatus.STOPPED,
            [
                (RecoveryActionType.RETRY_PAYMENT, RecoveryActionStatus.EXECUTED, 1),
                (RecoveryActionType.RETRY_PAYMENT, RecoveryActionStatus.EXECUTED, 25),
                (RecoveryActionType.RETRY_PAYMENT, RecoveryActionStatus.EXECUTED, 49),
                (RecoveryActionType.STOP_RECOVERY, RecoveryActionStatus.EXECUTED, 50),
            ]
        )

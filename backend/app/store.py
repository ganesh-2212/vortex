from typing import Dict, List
import uuid
from app.models.domain import Merchant, Customer, RevenueEvent, RecoveryCase, RecoveryAction, AuditLog

class MemoryStore:
    def __init__(self):
        self.merchants: Dict[uuid.UUID, Merchant] = {}
        self.customers: Dict[uuid.UUID, Customer] = {}
        self.revenue_events: Dict[uuid.UUID, RevenueEvent] = {}
        self.recovery_cases: Dict[uuid.UUID, RecoveryCase] = {}
        self.recovery_actions: Dict[uuid.UUID, RecoveryAction] = {}
        self.audit_logs: List[AuditLog] = []

    def clear(self):
        self.merchants.clear()
        self.customers.clear()
        self.revenue_events.clear()
        self.recovery_cases.clear()
        self.recovery_actions.clear()
        self.audit_logs.clear()

store = MemoryStore()

def seed_store(store_instance: MemoryStore = store):
    """
    Explicitly seeds the store instance with demo merchants and customers.
    Should ONLY be used in test fixtures or dedicated dev sandbox endpoints.
    """
    merchant_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    customer_id_1 = uuid.UUID("22222222-2222-2222-2222-222222222222")
    customer_id_2 = uuid.UUID("33333333-3333-3333-3333-333333333333")

    store_instance.merchants[merchant_id] = Merchant(
        id=merchant_id,
        name="Acme Corp",
        email="acme@corp.com"
    )
    store_instance.customers[customer_id_1] = Customer(
        id=customer_id_1,
        merchant_id=merchant_id,
        name="Alice Smith",
        email="alice@smith.com",
        phone="+919876543210"
    )
    store_instance.customers[customer_id_2] = Customer(
        id=customer_id_2,
        merchant_id=merchant_id,
        name="Bob Jones",
        email="bob@jones.com",
        phone="+919876543211"
    )

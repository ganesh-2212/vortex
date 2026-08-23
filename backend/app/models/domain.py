from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field

# --- Enums ---

class RevenueEventType(str, Enum):
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS"
    CHECKOUT_ABANDONED = "CHECKOUT_ABANDONED"
    SUBSCRIPTION_FAILED = "SUBSCRIPTION_FAILED"
    INVOICE_OVERDUE = "INVOICE_OVERDUE"
    PAYMENT_RETRY = "PAYMENT_RETRY"
    REFUND = "REFUND"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RecoveryCaseStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RECOVERED = "RECOVERED"
    STOPPED = "STOPPED"
    ESCALATED = "ESCALATED"

class RecoveryActionType(str, Enum):
    RETRY_PAYMENT = "RETRY_PAYMENT"
    SEND_PAYMENT_LINK = "SEND_PAYMENT_LINK"
    SEND_REMINDER = "SEND_REMINDER"
    OFFER_ALTERNATIVE_METHOD = "OFFER_ALTERNATIVE_METHOD"
    ESCALATE_TO_HUMAN = "ESCALATE_TO_HUMAN"
    STOP_RECOVERY = "STOP_RECOVERY"

class RecoveryActionStatus(str, Enum):
    PROPOSED = "PROPOSED"
    ALLOWED = "ALLOWED"
    BLOCKED = "BLOCKED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

# --- Database / Domain Entities ---

class Merchant(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Customer(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    merchant_id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RevenueEvent(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    merchant_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    event_type: RevenueEventType
    amount: Decimal
    currency: str = "INR"
    status: str
    occurred_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecoveryCase(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    merchant_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    revenue_event_id: uuid.UUID
    amount_at_risk: Decimal
    risk_level: RiskLevel
    risk_reason: Optional[str] = None
    status: RecoveryCaseStatus = RecoveryCaseStatus.OPEN
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecoveryAction(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    recovery_case_id: uuid.UUID
    action_type: RecoveryActionType
    status: RecoveryActionStatus
    attempt_number: int = 1
    reason: Optional[str] = None
    executed_at: Optional[datetime] = None
    result: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    recovery_case_id: Optional[uuid.UUID] = None
    actor_type: str  # SYSTEM, MERCHANT, CUSTOMER, etc.
    action: str      # CASE_CREATED, ACTION_PROPOSED, ACTION_ALLOWED, ACTION_BLOCKED, etc.
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- API Request/Response Schemas ---

class MerchantCreate(BaseModel):
    name: str
    email: Optional[str] = None

class CustomerCreate(BaseModel):
    merchant_id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class RevenueEventCreate(BaseModel):
    merchant_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    event_type: RevenueEventType
    amount: Decimal
    currency: str = "INR"
    status: str
    occurred_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ProposedActionCreate(BaseModel):
    action_type: RecoveryActionType
    attempt_number: Optional[int] = None
    reason: Optional[str] = None

class ActionEvaluationResponse(BaseModel):
    action: RecoveryActionType
    status: RecoveryActionStatus
    reason: str

class RecoveryCaseDetailResponse(BaseModel):
    case: RecoveryCase
    actions: List[RecoveryAction]
    audit_history: List[AuditLog]

# --- F03 Intelligence response models ---

class RiskDistribution(BaseModel):
    critical_amount: Decimal
    critical_count: int
    high_amount: Decimal
    high_count: int
    medium_amount: Decimal
    medium_count: int
    low_amount: Decimal
    low_count: int

class LeakageCategory(BaseModel):
    event_type: RevenueEventType
    case_count: int
    amount_at_risk: Decimal
    percentage_of_total: float

class PriorityBreakdown(BaseModel):
    risk_severity_score: float
    amount_score: float
    failure_count_score: float
    recovery_opportunity_score: float
    age_score: float

class IntelligenceReason(BaseModel):
    message: str
    type: str  # 'risk', 'priority', 'signal'

class TimeSensitivity(BaseModel):
    case_age_seconds: float
    hours_since_event: float
    category: str  # FRESH, AGING, STALE

class PriorityCase(BaseModel):
    case_id: uuid.UUID
    amount_at_risk: Decimal
    risk_level: RiskLevel
    priority_score: float
    priority_breakdown: PriorityBreakdown
    reasons: List[IntelligenceReason]
    time_sensitivity: TimeSensitivity
    estimated_recoverable: Decimal

class RevenueIntelligenceSummary(BaseModel):
    revenue_at_risk: Decimal
    estimated_recoverable: Decimal
    open_case_count: int
    critical_amount: Decimal
    high_amount: Decimal
    medium_amount: Decimal
    low_amount: Decimal
    top_leakage_type: Optional[str]
    generated_at: datetime

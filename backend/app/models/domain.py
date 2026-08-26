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

    # Recovery config fields
    recovery_enabled: bool = True
    max_retry_attempts: int = 3
    retry_cooldown_hours: int = 24
    supported_recovery_actions: List[str] = Field(default_factory=lambda: ["RETRY_PAYMENT", "SEND_REMINDER", "OFFER_ALTERNATIVE_METHOD", "ESCALATE_TO_HUMAN", "STOP_RECOVERY"])
    escalation_behavior: str = "MANUAL"
    webhook_status: str = "CONFIGURED"

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
    recovered_amount: Decimal = Decimal("0.00")
    recovered_at: Optional[datetime] = None
    outcome: Optional[str] = None
    provider_transaction_id: Optional[str] = None
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
    recovery_enabled: Optional[bool] = None
    max_retry_attempts: Optional[int] = None
    retry_cooldown_hours: Optional[int] = None
    supported_recovery_actions: Optional[List[str]] = None
    escalation_behavior: Optional[str] = None
    webhook_status: Optional[str] = None

class MerchantConfigUpdate(BaseModel):
    recovery_enabled: bool
    max_retry_attempts: int
    retry_cooldown_hours: int
    supported_recovery_actions: List[str]
    escalation_behavior: str
    webhook_status: str

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

# --- F06 Execution Models ---

class ActionExecutionRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)

class ProviderExecutionResult(BaseModel):
    success: bool
    transaction_id: Optional[str] = None
    error_code: Optional[str] = None
    raw_response: Dict[str, Any] = Field(default_factory=dict)

class ActionExecutionResponse(BaseModel):
    action_id: uuid.UUID
    action_type: RecoveryActionType
    status: RecoveryActionStatus
    executed_at: Optional[datetime] = None
    result: Dict[str, Any] = Field(default_factory=dict)
    updated_case_status: RecoveryCaseStatus

# --- F07 Lifecycle & Outcome Models ---

class RecoveryAttempt(BaseModel):
    case_id: uuid.UUID
    action_id: uuid.UUID
    attempt_number: int
    action_type: RecoveryActionType
    status: RecoveryActionStatus
    amount_attempted: Decimal
    amount_recovered: Decimal
    provider_transaction_id: Optional[str] = None
    executed_timestamp: Optional[datetime] = None
    failure_reason: Optional[str] = None

class RecoveryOutcome(BaseModel):
    case_id: uuid.UUID
    status: RecoveryCaseStatus
    outcome: Optional[str] = None # SUCCESS, FAILED, STOPPED, ESCALATED
    actual_recovered_amount: Decimal
    recovered_at: Optional[datetime] = None
    provider_transaction_id: Optional[str] = None
    recovery_duration_seconds: Optional[float] = None

class RecoveryLifecycle(BaseModel):
    case_id: uuid.UUID
    current_status: RecoveryCaseStatus
    total_attempts: int
    successful_attempts: int
    failed_attempts: int
    actual_recovered_amount: Decimal
    first_attempt_timestamp: Optional[datetime] = None
    last_attempt_timestamp: Optional[datetime] = None
    recovery_duration_seconds: Optional[float] = None
    final_outcome: Optional[str] = None

class RecoveryOutcomeSummary(BaseModel):
    total_cases: int
    open_cases: int
    recovered_cases: int
    stopped_cases: int
    escalated_cases: int
    total_amount_at_risk: Decimal
    actual_recovered_revenue: Decimal
    recovery_rate: float
    successful_retry_count: int
    failed_retry_count: int

# --- F08 Automation & Recommendation Models ---

class RecommendationReason(BaseModel):
    type: str
    message: str
    impact: str # e.g. positive, negative, neutral

class RecoveryRecommendation(BaseModel):
    case_id: uuid.UUID
    recommended_action: RecoveryActionType
    confidence: int
    priority_score: float
    risk_level: RiskLevel
    time_sensitivity: str
    estimated_recoverable: Decimal
    guardrail_status: str
    reasons: List[RecommendationReason]
    generated_at: datetime

class RecommendationResponse(BaseModel):
    case_id: uuid.UUID
    recommendation: RecoveryRecommendation
    alternative_actions: List[RecoveryActionType] = Field(default_factory=list)
    generated_at: datetime

class AutomationSummary(BaseModel):
    cases_evaluated: int
    retry_recommended: int
    escalation_recommended: int
    stop_recommended: int
    blocked_retry_count: int

# --- F10 Webhook Simulator Models ---

class WebhookSimulateRequest(BaseModel):
    event: str
    amount: Decimal = Decimal("5000")
    currency: str = "INR"
    payment_id: str
    email: str = "demo@merchant.test"
    contact: str = "9876543210"

class WebhookSimulateResponse(BaseModel):
    webhook_accepted: bool
    event: str
    payment_id: str
    amount: Decimal
    currency: str
    result_status: str
    event_id: Optional[str] = None
    case_id: Optional[str] = None
    message: Optional[str] = None


# --- F11 Strategy Optimization Models ---

class StrategyOption(BaseModel):
    strategy_name: str  # "IMMEDIATE_RETRY", "DELAYED_RETRY", "ALTERNATE_PAYMENT", "ESCALATE_TO_HUMAN", "NO_INTERVENTION"
    eligible: bool
    guardrail_status: str  # ALLOWED or BLOCKED
    recovery_probability: int
    expected_recovery_amount: Decimal
    intervention_cost: Decimal
    expected_net_recovery: Decimal
    confidence: int
    reasons: List[str]
    executable: bool

class StrategyOptimizationResponse(BaseModel):
    case_id: uuid.UUID
    amount_at_risk: Decimal
    recommended_strategy: str
    recovery_probability: int
    expected_recovery_amount: Decimal
    expected_net_recovery: Decimal
    confidence: int
    guardrail_status: str
    reasons: List[str]
    strategies: List[StrategyOption]
    generated_at: datetime

class StrategyStatistics(BaseModel):
    cases_optimized: int
    total_expected_recovery: Decimal
    strategy_counts: Dict[str, int]
    average_confidence: float


# --- F12 Recovery Simulation Models ---

class SimulatedCaseDetail(BaseModel):
    case_id: uuid.UUID
    amount_at_risk: Decimal
    risk_level: str
    no_intervention_recovered: Decimal
    basic_retry_strategy: str
    basic_retry_recovered: Decimal
    basic_retry_cost: Decimal
    sentinel_strategy: str
    sentinel_probability: int
    sentinel_recovered: Decimal
    sentinel_cost: Decimal
    sentinel_net_recovered: Decimal
    incremental_vs_no_intervention: Decimal
    incremental_vs_basic_retry: Decimal
    final_outcome: str

class SimulationRunRequest(BaseModel):
    case_ids: List[uuid.UUID] = Field(default_factory=list)

class SimulationRunResponse(BaseModel):
    simulation_id: uuid.UUID
    total_revenue_at_risk: Decimal
    no_intervention_recovered_amount: Decimal
    basic_retry_recovered_amount: Decimal
    sentinel_recovered_amount: Decimal
    sentinel_recovery_rate: float
    incremental_recovery_vs_no_intervention: Decimal
    incremental_recovery_vs_basic_retry: Decimal
    additional_recovery_percentage: float
    total_intervention_cost: Decimal
    sentinel_net_recovery: Decimal
    number_of_simulated_cases: int
    number_of_simulated_successful_recoveries: int
    cases: List[SimulatedCaseDetail]
    run_at: datetime


class SimulationStatistics(BaseModel):
    simulations_run: int
    total_cases_simulated: int
    average_sentinel_recovery_rate: float
    total_incremental_recovered_vs_basic: Decimal

# --- F13 Orchestration Models ---

class OrchestrationDecisionType(str, Enum):
    EXECUTE_NOW = "EXECUTE_NOW"
    WAIT_COOLDOWN = "WAIT_COOLDOWN"
    SCHEDULE_RETRY = "SCHEDULE_RETRY"
    REEVALUATE = "REEVALUATE"
    ESCALATE_TO_HUMAN = "ESCALATE_TO_HUMAN"
    STOP_RECOVERY = "STOP_RECOVERY"
    CASE_EXPIRED = "CASE_EXPIRED"
    ALREADY_RECOVERED = "ALREADY_RECOVERED"

class OrchestrationState(BaseModel):
    case_id: uuid.UUID
    decision: OrchestrationDecisionType
    selected_strategy: str
    next_action: Optional[RecoveryActionType] = None
    scheduled_time: Optional[datetime] = None
    attempt_number: int
    cooldown_active: bool
    reason: str
    human_escalation_required: bool
    evaluated_at: datetime


# --- F14 Strategy Performance Models ---

class StrategyOutcomeStatistics(BaseModel):
    strategy_type: str
    total_attempts: int
    successful_attempts: int
    failed_attempts: int
    success_rate: float
    total_recovered: Decimal
    average_recovered: Decimal
    total_cost: Decimal
    net_recovery: Decimal
    average_attempts_to_recovery: float
    expected_recovery: Decimal
    actual_recovery: Decimal
    recovery_variance: Decimal

class StrategyPerformance(BaseModel):
    strategy_type: str
    performance_score: float
    success_rate: float
    net_recovery: Decimal
    confidence: int
    sample_size: int
    trend: str
    recommended_usage: str

class StrategyPerformanceResponse(BaseModel):
    generated_at: datetime
    total_cases_analyzed: int
    total_revenue_at_risk: Decimal
    total_revenue_recovered: Decimal
    overall_recovery_rate: float
    strategy_statistics: List[StrategyOutcomeStatistics]
    best_strategy: str
    strongest_strategy_by_revenue: str
    strongest_strategy_by_success_rate: str

class EventStrategyPerformance(BaseModel):
    event_type: str
    total_cases: int
    best_strategy: str
    best_strategy_success_rate: float
    best_strategy_net_recovery: Decimal
    strategy_breakdown: List[StrategyOutcomeStatistics]

class StrategyPerformanceRecommendation(BaseModel):
    case_id: uuid.UUID
    f11_baseline_strategy: str
    historical_best_strategy: str
    combined_advisory_strategy: str
    confidence: int
    sample_size: int
    explanation: str
    fallback_reason: Optional[str] = None


from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
import uuid

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RiskLevel,
    RevenueEventType,
    IntelligenceReason,
    TimeSensitivity,
    PriorityBreakdown,
    PriorityCase,
    RiskDistribution,
    LeakageCategory,
    RevenueIntelligenceSummary,
)
from app.store import MemoryStore

def get_open_cases(store: MemoryStore) -> List[RecoveryCase]:
    """
    Returns all cases with open statuses: OPEN, IN_PROGRESS, ESCALATED.
    """
    open_statuses = {
        RecoveryCaseStatus.OPEN,
        RecoveryCaseStatus.IN_PROGRESS,
        RecoveryCaseStatus.ESCALATED,
    }
    return [c for c in store.recovery_cases.values() if c.status in open_statuses]

def get_case_retry_count(case_id: uuid.UUID, store: MemoryStore) -> int:
    """
    Helper to calculate number of retries associated with a recovery case.
    """
    from app.models.domain import RecoveryActionType, RecoveryActionStatus
    return sum(
        1 for a in store.recovery_actions.values()
        if a.recovery_case_id == case_id
        and a.action_type == RecoveryActionType.RETRY_PAYMENT
        and a.status != RecoveryActionStatus.BLOCKED
    )

def calculate_time_sensitivity(occurred_at: datetime, current_time: datetime) -> TimeSensitivity:
    """
    Calculate timezone-aware time sensitivity metrics.
    """
    # Ensure timezone aware
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
        
    case_age_seconds = (current_time - occurred_at).total_seconds()
    if case_age_seconds < 0:
        case_age_seconds = 0.0
        
    hours_since_event = case_age_seconds / 3600.0
    
    if hours_since_event < 24.0:
        category = "FRESH"
    elif hours_since_event <= 72.0:
        category = "AGING"
    else:
        category = "STALE"
        
    return TimeSensitivity(
        case_age_seconds=case_age_seconds,
        hours_since_event=hours_since_event,
        category=category
    )

def calculate_priority_score(
    case: RecoveryCase,
    failure_count: int,
    retry_count: int,
    current_time: datetime
) -> tuple[float, PriorityBreakdown]:
    """
    Calculate a priority score out of 100 based on deterministic weighted metrics.
    """
    # 1. Risk Severity Score (35%)
    if case.risk_level == RiskLevel.CRITICAL:
        risk_score = 100.0
    elif case.risk_level == RiskLevel.HIGH:
        risk_score = 75.0
    elif case.risk_level == RiskLevel.MEDIUM:
        risk_score = 50.0
    else:
        risk_score = 25.0
        
    # 2. Amount Score (30%)
    amount_score = min(100.0, (float(case.amount_at_risk) / 50000.0) * 100.0)
    
    # 3. Time Sensitivity Score (15%)
    ts = calculate_time_sensitivity(case.created_at, current_time)
    if ts.category == "FRESH":
        age_score = 100.0
    elif ts.category == "AGING":
        age_score = 60.0
    else:
        age_score = 20.0
        
    # 4. Failure Count Score (10%)
    failure_score = min(100.0, failure_count * 25.0)
    
    # 5. Recovery Opportunity Score (10%)
    # Full opportunity remains if less than 3 attempts have been executed
    opportunity_score = 100.0 if retry_count < 3 else 0.0
    
    weighted_score = (
        (risk_score * 0.35) +
        (amount_score * 0.30) +
        (age_score * 0.15) +
        (failure_score * 0.10) +
        (opportunity_score * 0.10)
    )
    
    # Rounded to 2 decimal places
    final_score = round(weighted_score, 2)
    
    breakdown = PriorityBreakdown(
        risk_severity_score=risk_score,
        amount_score=amount_score,
        failure_count_score=failure_score,
        recovery_opportunity_score=opportunity_score,
        age_score=age_score
    )
    
    return final_score, breakdown

def calculate_estimated_recoverable(
    case: RecoveryCase,
    failure_count: int,
    retry_count: int,
    current_time: datetime
) -> Decimal:
    """
    Calculate an estimated recoverable amount using a transparent heuristic formula.
    
    Heuristic rate factors:
    - Base Rate: Critical (0.20), High (0.40), Medium (0.60), Low (0.80)
    - Retry Factor: 0 retries (1.0), 1 retry (0.8), 2 retries (0.5), >=3 retries (0.0)
    - Age Factor: Fresh (1.0), Aging (0.8), Stale (0.5)
    - Failure Factor: 0 failures (1.0), 1 failure (0.9), >=2 failures (0.7)
    """
    # Base Rate
    if case.risk_level == RiskLevel.CRITICAL:
        base_rate = 0.20
    elif case.risk_level == RiskLevel.HIGH:
        base_rate = 0.40
    elif case.risk_level == RiskLevel.MEDIUM:
        base_rate = 0.60
    else:
        base_rate = 0.80
        
    # Retry Factor
    if retry_count == 0:
        retry_factor = 1.0
    elif retry_count == 1:
        retry_factor = 0.8
    elif retry_count == 2:
        retry_factor = 0.5
    else:
        retry_factor = 0.0
        
    # Age Factor
    ts = calculate_time_sensitivity(case.created_at, current_time)
    if ts.category == "FRESH":
        age_factor = 1.0
    elif ts.category == "AGING":
        age_factor = 0.8
    else:
        age_factor = 0.5
        
    # Failure Factor
    if failure_count == 0:
        failure_factor = 1.0
    elif failure_count == 1:
        failure_factor = 0.9
    else:
        failure_factor = 0.7
        
    rate = base_rate * retry_factor * age_factor * failure_factor
    # Cap rate between 0.0 and 1.0
    rate = max(0.0, min(1.0, rate))
    
    estimated_val = case.amount_at_risk * Decimal(str(rate))
    return estimated_val.quantize(Decimal("0.01"))

def generate_explainability_reasons(
    case: RecoveryCase,
    priority_score: float,
    breakdown: PriorityBreakdown,
    time_sensitivity: TimeSensitivity
) -> List[IntelligenceReason]:
    """
    Produce explainability reasons describing risk severity, priority indicators, and signal contributions.
    """
    reasons = []
    
    # 1. Risk reasons
    if case.risk_level == RiskLevel.CRITICAL:
        reasons.append(IntelligenceReason(
            message=f"Case assessed as CRITICAL risk: {case.risk_reason or 'Risk threshold exceeded'}.",
            type="risk"
        ))
    elif case.risk_level == RiskLevel.HIGH:
        reasons.append(IntelligenceReason(
            message=f"Case assessed as HIGH risk: {case.risk_reason or 'High-value or repeated failure'}.",
            type="risk"
        ))
    elif case.risk_level == RiskLevel.MEDIUM:
        reasons.append(IntelligenceReason(
            message=f"Case assessed as MEDIUM risk: {case.risk_reason or 'Standard payment warning'}.",
            type="risk"
        ))
    else:
        reasons.append(IntelligenceReason(
            message="Case assessed as LOW risk: low exposure failure.",
            type="risk"
        ))
        
    # 2. Priority & Signal reasons
    reasons.append(IntelligenceReason(
        message=f"Deterministic priority score of {priority_score}/100 calculated from risk severity, amount at risk, age, and failure counts.",
        type="priority"
    ))
    
    # Amount impact
    reasons.append(IntelligenceReason(
        message=f"Amount at risk of {case.amount_at_risk} INR contributed {breakdown.amount_score:.1f}/100 to priority score.",
        type="signal"
    ))
    
    # Time impact
    reasons.append(IntelligenceReason(
        message=f"Case age of {time_sensitivity.hours_since_event:.1f} hours categorized as {time_sensitivity.category} (impact: {breakdown.age_score:.1f}/100).",
        type="signal"
    ))
    
    # Opportunity impact
    if breakdown.recovery_opportunity_score > 0.0:
        reasons.append(IntelligenceReason(
            message="Recovery Opportunity remains active (less than 3 payment retry attempts executed).",
            type="signal"
        ))
    else:
        reasons.append(IntelligenceReason(
            message="Recovery Opportunity is exhausted (maximum retry attempts reached).",
            type="signal"
        ))
        
    return reasons

# --- High Level Service Functions ---

def get_revenue_intelligence_summary(store: MemoryStore, current_time: datetime) -> RevenueIntelligenceSummary:
    """
    Computes global intelligence summary.
    If empty, returns zero-valued models.
    """
    open_cases = get_open_cases(store)
    
    if not open_cases:
        return RevenueIntelligenceSummary(
            revenue_at_risk=Decimal("0.00"),
            estimated_recoverable=Decimal("0.00"),
            open_case_count=0,
            critical_amount=Decimal("0.00"),
            high_amount=Decimal("0.00"),
            medium_amount=Decimal("0.00"),
            low_amount=Decimal("0.00"),
            top_leakage_type=None,
            generated_at=current_time
        )
        
    revenue_at_risk = sum(c.amount_at_risk for c in open_cases)
    
    # Risk buckets
    critical_amount = sum(c.amount_at_risk for c in open_cases if c.risk_level == RiskLevel.CRITICAL)
    high_amount = sum(c.amount_at_risk for c in open_cases if c.risk_level == RiskLevel.HIGH)
    medium_amount = sum(c.amount_at_risk for c in open_cases if c.risk_level == RiskLevel.MEDIUM)
    low_amount = sum(c.amount_at_risk for c in open_cases if c.risk_level == RiskLevel.LOW)
    
    # Estimated recoverable sum
    estimated_recoverable = Decimal("0.00")
    for case in open_cases:
        # Determine failure count for the customer
        failure_count = sum(
            1 for e in store.revenue_events.values()
            if e.customer_id == case.customer_id
            and e.event_type in {
                RevenueEventType.PAYMENT_FAILED,
                RevenueEventType.SUBSCRIPTION_FAILED,
                RevenueEventType.INVOICE_OVERDUE,
                RevenueEventType.CHECKOUT_ABANDONED
            }
            and e.id != case.revenue_event_id
        )
        retry_count = get_case_retry_count(case.id, store)
        estimated_recoverable += calculate_estimated_recoverable(case, failure_count, retry_count, current_time)
        
    # Top leakage type calculation
    leakage_by_type: Dict[str, Decimal] = {}
    for case in open_cases:
        # Lookup event to find event_type
        event = store.revenue_events.get(case.revenue_event_id)
        if event:
            leakage_by_type[event.event_type] = leakage_by_type.get(event.event_type, Decimal("0.00")) + case.amount_at_risk
            
    top_leakage_type = None
    if leakage_by_type:
        top_leakage_type = max(leakage_by_type, key=lambda k: leakage_by_type[k])
        
    return RevenueIntelligenceSummary(
        revenue_at_risk=revenue_at_risk,
        estimated_recoverable=estimated_recoverable,
        open_case_count=len(open_cases),
        critical_amount=critical_amount,
        high_amount=high_amount,
        medium_amount=medium_amount,
        low_amount=low_amount,
        top_leakage_type=top_leakage_type,
        generated_at=current_time
    )

def get_risk_distribution(store: MemoryStore) -> RiskDistribution:
    """
    Computes case counts and risk values grouped by RiskLevel.
    """
    open_cases = get_open_cases(store)
    
    critical_amount = Decimal("0.00")
    critical_count = 0
    high_amount = Decimal("0.00")
    high_count = 0
    medium_amount = Decimal("0.00")
    medium_count = 0
    low_amount = Decimal("0.00")
    low_count = 0
    
    for c in open_cases:
        if c.risk_level == RiskLevel.CRITICAL:
            critical_amount += c.amount_at_risk
            critical_count += 1
        elif c.risk_level == RiskLevel.HIGH:
            high_amount += c.amount_at_risk
            high_count += 1
        elif c.risk_level == RiskLevel.MEDIUM:
            medium_amount += c.amount_at_risk
            medium_count += 1
        elif c.risk_level == RiskLevel.LOW:
            low_amount += c.amount_at_risk
            low_count += 1
            
    return RiskDistribution(
        critical_amount=critical_amount,
        critical_count=critical_count,
        high_amount=high_amount,
        high_count=high_count,
        medium_amount=medium_amount,
        medium_count=medium_count,
        low_amount=low_amount,
        low_count=low_count
    )

def get_leakage_analysis(store: MemoryStore) -> List[LeakageCategory]:
    """
    Groups open cases by originating revenue event type.
    """
    open_cases = get_open_cases(store)
    if not open_cases:
        return []
        
    total_amount = sum(c.amount_at_risk for c in open_cases)
    
    # Intermediate groupings
    categories: Dict[str, Dict[str, Any]] = {}
    for case in open_cases:
        event = store.revenue_events.get(case.revenue_event_id)
        if event:
            event_type = event.event_type
            if event_type not in categories:
                categories[event_type] = {
                    "case_count": 0,
                    "amount_at_risk": Decimal("0.00")
                }
            categories[event_type]["case_count"] += 1
            categories[event_type]["amount_at_risk"] += case.amount_at_risk
            
    results = []
    for etype, data in categories.items():
        pct = 0.0
        if total_amount > 0:
            pct = float(data["amount_at_risk"] / total_amount) * 100.0
        results.append(LeakageCategory(
            event_type=etype,
            case_count=data["case_count"],
            amount_at_risk=data["amount_at_risk"],
            percentage_of_total=round(pct, 2)
        ))
        
    # Sorted by amount_at_risk descending
    results.sort(key=lambda x: x.amount_at_risk, reverse=True)
    return results

def get_priority_cases(store: MemoryStore, current_time: datetime) -> List[PriorityCase]:
    """
    Return PriorityCase objects sorted by priority score descending.
    """
    open_cases = get_open_cases(store)
    results = []
    
    for case in open_cases:
        # Determine failure count for the customer
        failure_count = sum(
            1 for e in store.revenue_events.values()
            if e.customer_id == case.customer_id
            and e.event_type in {
                RevenueEventType.PAYMENT_FAILED,
                RevenueEventType.SUBSCRIPTION_FAILED,
                RevenueEventType.INVOICE_OVERDUE,
                RevenueEventType.CHECKOUT_ABANDONED
            }
            and e.id != case.revenue_event_id
        )
        retry_count = get_case_retry_count(case.id, store)
        
        score, breakdown = calculate_priority_score(case, failure_count, retry_count, current_time)
        ts = calculate_time_sensitivity(case.created_at, current_time)
        est = calculate_estimated_recoverable(case, failure_count, retry_count, current_time)
        reasons = generate_explainability_reasons(case, score, breakdown, ts)
        
        results.append(PriorityCase(
            case_id=case.id,
            amount_at_risk=case.amount_at_risk,
            risk_level=case.risk_level,
            priority_score=score,
            priority_breakdown=breakdown,
            reasons=reasons,
            time_sensitivity=ts,
            estimated_recoverable=est
        ))
        
    # Sort by score descending
    results.sort(key=lambda x: x.priority_score, reverse=True)
    return results

def get_single_case_intelligence(case_id: uuid.UUID, store: MemoryStore, current_time: datetime) -> Optional[PriorityCase]:
    """
    Retrieve priority/intelligence details for a single recovery case.
    """
    case = store.recovery_cases.get(case_id)
    if not case:
        return None
        
    # Determine failure count
    failure_count = sum(
        1 for e in store.revenue_events.values()
        if e.customer_id == case.customer_id
        and e.event_type in {
            RevenueEventType.PAYMENT_FAILED,
            RevenueEventType.SUBSCRIPTION_FAILED,
            RevenueEventType.INVOICE_OVERDUE,
            RevenueEventType.CHECKOUT_ABANDONED
        }
        and e.id != case.revenue_event_id
    )
    retry_count = get_case_retry_count(case.id, store)
    
    score, breakdown = calculate_priority_score(case, failure_count, retry_count, current_time)
    ts = calculate_time_sensitivity(case.created_at, current_time)
    est = calculate_estimated_recoverable(case, failure_count, retry_count, current_time)
    reasons = generate_explainability_reasons(case, score, breakdown, ts)
    
    return PriorityCase(
        case_id=case.id,
        amount_at_risk=case.amount_at_risk,
        risk_level=case.risk_level,
        priority_score=score,
        priority_breakdown=breakdown,
        reasons=reasons,
        time_sensitivity=ts,
        estimated_recoverable=est
    )

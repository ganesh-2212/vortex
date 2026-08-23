from decimal import Decimal
from typing import Any, Dict
from pydantic import BaseModel
from app.models.domain import RevenueEvent, RevenueEventType, RiskLevel

class RiskResult(BaseModel):
    risk_level: RiskLevel
    reason: str
    signals: Dict[str, Any]

def assess_risk(
    event: RevenueEvent,
    existing_failures_count: int = 0,
    retry_count: int = 0
) -> RiskResult:
    """
    Assess recovery risk level deterministically based on structured signals.
    """
    amount = event.amount
    event_type = event.event_type
    
    # Overdue status is True if event type is INVOICE_OVERDUE
    overdue_status = (event_type == RevenueEventType.INVOICE_OVERDUE)
    
    # Build structured, extensible signals dictionary
    signals = {
        "amount": amount,
        "failure_count": existing_failures_count,
        "event_type": event_type,
        "overdue_status": overdue_status,
        "retry_count": retry_count
    }
    
    # 1. Very high-value failed payment
    if amount >= Decimal("50000"):
        return RiskResult(
            risk_level=RiskLevel.CRITICAL,
            reason="Very high-value failed payment (>= 50,000 INR)",
            signals=signals
        )
        
    # 2. Severely overdue high-value revenue
    if overdue_status and amount >= Decimal("10000"):
        return RiskResult(
            risk_level=RiskLevel.CRITICAL,
            reason="Severely overdue high-value revenue (>= 10,000 INR)",
            signals=signals
        )
        
    # 3. High-value failed payment
    if amount >= Decimal("10000"):
        return RiskResult(
            risk_level=RiskLevel.HIGH,
            reason="High-value failed payment (>= 10,000 INR)",
            signals=signals
        )
        
    # 4. Repeated payment failures
    if existing_failures_count >= 2:
        return RiskResult(
            risk_level=RiskLevel.HIGH,
            reason=f"Repeated payment failures (failure count: {existing_failures_count + 1})",
            signals=signals
        )
        
    # 5. Medium risk - secondary failure
    if existing_failures_count == 1:
        return RiskResult(
            risk_level=RiskLevel.MEDIUM,
            reason="Secondary payment failure",
            signals=signals
        )
        
    # 6. Very small amount + first failure
    if amount < Decimal("100") and existing_failures_count == 0:
        return RiskResult(
            risk_level=RiskLevel.LOW,
            reason="Very small amount and first failure",
            signals=signals
        )
        
    # Default
    return RiskResult(
        risk_level=RiskLevel.MEDIUM,
        reason="Standard failed event risk assessment",
        signals=signals
    )

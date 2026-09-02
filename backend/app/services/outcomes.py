from datetime import datetime
from decimal import Decimal
from typing import Optional

from app.models.domain import RecoveryCase, RecoveryCaseStatus

def record_retry_success(
    case: RecoveryCase,
    transaction_id: str,
    current_time: datetime
) -> None:
    """
    Transition case to RECOVERED and record the actual recovered amount and transaction ID.
    Prevent duplicate execution from double-counting recovered revenue.
    """
    case.status = RecoveryCaseStatus.RECOVERED
    case.recovered_amount = case.amount_at_risk
    case.recovered_at = current_time
    case.outcome = "SUCCESS"
    case.provider_transaction_id = transaction_id
    case.updated_at = current_time

def record_retry_failure(
    case: RecoveryCase,
    current_time: datetime
) -> None:
    """
    Record failed attempt. Actual recovered revenue remains 0.
    """
    case.outcome = "FAILED"
    case.updated_at = current_time

def record_stop_recovery(
    case: RecoveryCase,
    current_time: datetime
) -> None:
    """
    Transition case to STOPPED and record zero recovered revenue.
    """
    case.status = RecoveryCaseStatus.STOPPED
    case.outcome = "STOPPED"
    case.updated_at = current_time

def record_escalation(
    case: RecoveryCase,
    current_time: datetime
) -> None:
    """
    Transition case to ESCALATED and record zero recovered revenue.
    """
    case.status = RecoveryCaseStatus.ESCALATED
    case.outcome = "ESCALATED"
    case.updated_at = current_time

def confirm_payment_recovery(
    case: RecoveryCase,
    transaction_id: str,
    amount_recovered: Decimal,
    current_time: datetime,
    source: str = "webhook"
) -> bool:
    """
    Centralized idempotent function to confirm a payment recovery.
    Returns True if this call actually performed the recovery, 
    False if it was already recovered.
    """
    from app.store import store
    from app.models.domain import RevenueEvent, RevenueEventType
    from app.services.audit import log_audit_event
    import uuid

    if case.status == RecoveryCaseStatus.RECOVERED:
        return False # Idempotent return
        
    # LEARNING LOOP: Capture before stats
    from app.services.strategy_performance import _calculate_base_stats
    before_stats_map, _, _, _ = _calculate_base_stats(store)
        
    case.status = RecoveryCaseStatus.RECOVERED
    case.recovered_amount = amount_recovered
    case.recovered_at = current_time
    case.outcome = "SUCCESS"
    case.provider_transaction_id = transaction_id
    case.updated_at = current_time
    
    # Create success event to complete the loop
    success_event = RevenueEvent(
        id=uuid.uuid4(),
        merchant_id=case.merchant_id,
        customer_id=case.customer_id,
        event_type=RevenueEventType.PAYMENT_SUCCESS,
        amount=amount_recovered,
        currency="INR",
        status="SUCCESS",
        occurred_at=current_time,
        metadata={
            "source": f"razorpay_{source}",
            "transaction_id": transaction_id,
            "case_id": str(case.id)
        },
        created_at=current_time
    )
    store.revenue_events[success_event.id] = success_event
    
    # Log audit event
    log_audit_event(
        recovery_case_id=case.id,
        actor_type="SYSTEM",
        action="CASE_RECOVERED",
        details={
            "reason": f"Payment succeeded via {source}, recovery complete",
            "transaction_id": transaction_id,
            "amount": float(amount_recovered)
        }
    )
    
    # LEARNING LOOP: Capture after stats and log update
    after_stats_map, _, _, _ = _calculate_base_stats(store)
    
    # Identify which strategy changed (find the one that was executed last)
    # The simplest way is to compare before and after success counts
    changed_strategy = None
    before_stat = None
    after_stat = None
    
    for strat_name, a_stat in after_stats_map.items():
        b_stat = before_stats_map.get(strat_name)
        if b_stat and a_stat.successful_attempts > b_stat.successful_attempts:
            changed_strategy = strat_name
            before_stat = b_stat
            after_stat = a_stat
            break
            
    if changed_strategy and after_stat and before_stat:
        log_audit_event(
            recovery_case_id=case.id,
            actor_type="SYSTEM",
            action="STRATEGY_PERFORMANCE_UPDATED",
            details={
                "strategy": changed_strategy,
                "outcome": "RECOVERED",
                "source": f"razorpay_{source}",
                "previous_attempts": before_stat.total_attempts,
                "updated_attempts": after_stat.total_attempts,
                "previous_successes": before_stat.successful_attempts,
                "updated_successes": after_stat.successful_attempts,
                "previous_recovery_rate": before_stat.success_rate,
                "updated_recovery_rate": after_stat.success_rate
            }
        )

    return True


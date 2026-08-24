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

from datetime import datetime
from typing import Any, Dict, Optional
import uuid
from app.models.domain import AuditLog
from app.store import store

def log_audit_event(
    recovery_case_id: Optional[uuid.UUID],
    actor_type: str,
    action: str,
    details: Dict[str, Any]
) -> AuditLog:
    """
    Log an event to the recovery audit trail.
    """
    log_entry = AuditLog(
        id=uuid.uuid4(),
        recovery_case_id=recovery_case_id,
        actor_type=actor_type,
        action=action,
        details=details,
        created_at=datetime.utcnow()
    )
    store.audit_logs.append(log_entry)
    return log_entry

import uuid
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.models.domain import (
    RecoveryLifecycle,
    RecoveryAttempt,
    RecoveryOutcome,
    RecoveryOutcomeSummary
)
from app.store import store
from app.services.lifecycle import (
    get_case_lifecycle,
    get_case_attempts,
    get_case_outcome,
    get_recovery_statistics
)

router = APIRouter()

@router.get(
    "/recovery-cases/{case_id}/lifecycle",
    response_model=RecoveryLifecycle
)
async def read_case_lifecycle(case_id: uuid.UUID = Path(...)):
    """
    Returns the recovery lifecycle statistics and status of a case.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    lifecycle = get_case_lifecycle(store, case_id)
    if not lifecycle:
        raise HTTPException(status_code=404, detail="Case lifecycle details not found")
    return lifecycle

@router.get(
    "/recovery-cases/{case_id}/attempts",
    response_model=List[RecoveryAttempt]
)
async def read_case_attempts(case_id: uuid.UUID = Path(...)):
    """
    Returns the chronological recovery attempt history of a case.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    return get_case_attempts(store, case_id)

@router.get(
    "/recovery-cases/{case_id}/outcome",
    response_model=RecoveryOutcome
)
async def read_case_outcome(case_id: uuid.UUID = Path(...)):
    """
    Returns the final outcome details of a case.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    outcome = get_case_outcome(store, case_id)
    if not outcome:
        raise HTTPException(status_code=404, detail="Case outcome details not found")
    return outcome

@router.get(
    "/recovery-statistics",
    response_model=RecoveryOutcomeSummary
)
async def read_recovery_statistics():
    """
    Returns aggregated recovery statistics across all cases.
    """
    return get_recovery_statistics(store)

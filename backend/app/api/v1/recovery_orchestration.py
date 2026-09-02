import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Path

from app.store import store
from app.models.domain import OrchestrationState
from app.services.recovery_orchestrator import evaluate_orchestration

router = APIRouter(prefix="/recovery-cases", tags=["Recovery Orchestration"])

@router.post("/{case_id}/orchestration/evaluate", response_model=OrchestrationState)
def evaluate_case_orchestration(case_id: uuid.UUID = Path(...)):
    """
    Evaluates an existing recovery case and returns a deterministic orchestration decision.
    Idempotent and safe.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    current_time = datetime.now(timezone.utc)
    try:
        state = evaluate_orchestration(case_id, store, current_time)
        return state
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{case_id}/orchestration", response_model=OrchestrationState)
def get_case_orchestration_state(case_id: uuid.UUID = Path(...)):
    """
    Returns the current orchestration state by triggering a fresh, side-effect-free evaluation.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    current_time = datetime.now(timezone.utc)
    try:
        state = evaluate_orchestration(case_id, store, current_time)
        return state
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

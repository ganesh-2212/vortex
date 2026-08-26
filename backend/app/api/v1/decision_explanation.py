import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from app.store import store, MemoryStore
from app.services.decision_explainer import build_decision_explanation
from app.models.domain import DecisionExplanation

router = APIRouter(prefix="/recovery-cases/{case_id}/explanation", tags=["Explainability"])

def get_store() -> MemoryStore:
    return store

@router.get("", response_model=DecisionExplanation)
def get_decision_explanation(case_id: uuid.UUID, store: MemoryStore = Depends(get_store)):
    """
    Returns the complete deterministic explanation for a case.
    """
    try:
        current_time = datetime.now(timezone.utc)
        return build_decision_explanation(case_id, store, current_time)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timeline")
def get_decision_timeline(case_id: uuid.UUID, store: MemoryStore = Depends(get_store)):
    """
    Returns the case evidence timeline.
    """
    try:
        current_time = datetime.now(timezone.utc)
        explanation = build_decision_explanation(case_id, store, current_time)
        return explanation.timeline
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/guardrails")
def get_decision_guardrails(case_id: uuid.UUID, store: MemoryStore = Depends(get_store)):
    """
    Returns detailed safety/guardrail explanations.
    """
    try:
        current_time = datetime.now(timezone.utc)
        explanation = build_decision_explanation(case_id, store, current_time)
        return {
            "guardrail_status": explanation.guardrail_status,
            "guardrail_checks": explanation.guardrail_checks
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

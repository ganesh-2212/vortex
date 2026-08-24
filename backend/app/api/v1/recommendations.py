import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Path

from app.models.domain import (
    RecommendationResponse,
    AutomationSummary
)
from app.store import store
from app.services.recommendation import (
    recommend_action,
    recommend_for_all_open_cases,
    get_recommendation_statistics
)

router = APIRouter()

@router.get(
    "/recommendations",
    response_model=List[RecommendationResponse]
)
async def read_recommendations():
    """
    Returns active recovery recommendations for all open cases sorted by priority score.
    """
    current_time = datetime.now(timezone.utc)
    return recommend_for_all_open_cases(store, current_time)

@router.get(
    "/recovery-cases/{case_id}/recommendation",
    response_model=RecommendationResponse
)
async def read_case_recommendation(case_id: uuid.UUID = Path(...)):
    """
    Returns the recovery action recommendation and alternatives for a single active case.
    """
    if case_id not in store.recovery_cases:
        raise HTTPException(status_code=404, detail="Recovery case not found")
        
    case = store.recovery_cases[case_id]
    current_time = datetime.now(timezone.utc)
    
    try:
        rec = recommend_action(store, case, current_time)
        
        alternatives = []
        if rec.recommended_action == "RETRY_PAYMENT":
            alternatives = ["ESCALATE_TO_HUMAN", "STOP_RECOVERY"]
        elif rec.recommended_action == "ESCALATE_TO_HUMAN":
            alternatives = ["STOP_RECOVERY"]
            
        return RecommendationResponse(
            case_id=case.id,
            recommendation=rec,
            alternative_actions=alternatives,
            generated_at=current_time
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/recommendation-statistics",
    response_model=AutomationSummary
)
async def read_recommendation_statistics():
    """
    Returns summary metrics of active recommendations across evaluated cases.
    """
    current_time = datetime.now(timezone.utc)
    return get_recommendation_statistics(store, current_time)

from datetime import datetime, timezone
from typing import List
import uuid
from fastapi import APIRouter, HTTPException, Path

from app.models.domain import (
    RevenueIntelligenceSummary,
    LeakageCategory,
    PriorityCase,
)
from app.store import store
from app.services import intelligence as intel_svc

router = APIRouter()

@router.get("/summary", response_model=RevenueIntelligenceSummary)
async def get_intelligence_summary():
    """
    Returns global summary metrics for all open cases, including heuristic recoverability estimations.
    """
    current_time = datetime.now(timezone.utc)
    summary = intel_svc.get_revenue_intelligence_summary(store, current_time)
    return summary

@router.get("/leakage", response_model=List[LeakageCategory])
async def get_leakage_analysis():
    """
    Returns leakage breakdown by originating event types, sorted by amount at risk descending.
    """
    return intel_svc.get_leakage_analysis(store)

@router.get("/priorities", response_model=List[PriorityCase])
async def get_priority_cases():
    """
    Returns all open recovery cases sorted by priority score descending.
    """
    current_time = datetime.now(timezone.utc)
    return intel_svc.get_priority_cases(store, current_time)

@router.get("/cases/{case_id}", response_model=PriorityCase)
async def get_case_intelligence(case_id: uuid.UUID = Path(...)):
    """
    Returns detailed priority, time sensitivity, and heuristic recoverability for a single case.
    """
    current_time = datetime.now(timezone.utc)
    case_intel = intel_svc.get_single_case_intelligence(case_id, store, current_time)
    if not case_intel:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    return case_intel

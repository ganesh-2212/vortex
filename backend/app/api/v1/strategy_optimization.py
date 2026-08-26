import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Path

from app.models.domain import StrategyOptimizationResponse, StrategyStatistics
from app.store import store
from app.services.strategy_optimizer import (
    optimize_strategy,
    optimize_all_strategies,
    get_strategy_statistics,
)

router = APIRouter()


@router.get("/recovery-cases/{case_id}/strategy", response_model=StrategyOptimizationResponse)
async def get_case_strategy(case_id: uuid.UUID = Path(...)):
    """
    Computes recovery strategy optimization metrics for a specific case.
    """
    case = store.recovery_cases.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    try:
        current_time = datetime.now(timezone.utc)
        result = optimize_strategy(store, case, current_time)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))


@router.get("/strategy-optimization", response_model=List[StrategyOptimizationResponse])
async def get_all_cases_strategies():
    """
    Calculates and returns optimized strategy recommendations for all active cases.
    """
    try:
        current_time = datetime.now(timezone.utc)
        results = optimize_all_strategies(store, current_time)
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/strategy-statistics", response_model=StrategyStatistics)
async def get_optimized_strategy_stats():
    """
    Retrieves aggregated optimization statistics across all active cases.
    """
    try:
        current_time = datetime.now(timezone.utc)
        stats = get_strategy_statistics(store, current_time)
        return stats
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

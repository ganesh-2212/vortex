from typing import List
import uuid
from fastapi import APIRouter, HTTPException, Path

from app.store import store
from app.models.domain import (
    StrategyPerformanceResponse,
    StrategyOutcomeStatistics,
    EventStrategyPerformance,
    StrategyPerformanceRecommendation,
)
from app.services.strategy_performance import (
    get_strategy_performance,
    get_strategy_performance_by_event,
    get_strategy_recommendation,
)

router = APIRouter(prefix="/strategy-performance", tags=["Strategy Performance"])

@router.get("", response_model=StrategyPerformanceResponse)
def read_strategy_performance():
    """
    Returns complete strategy performance statistics based on historical outcomes.
    """
    return get_strategy_performance(store)

@router.get("/by-event-type", response_model=List[EventStrategyPerformance])
def read_strategy_performance_by_event_type():
    """
    Returns strategy performance grouped by payment/revenue event type.
    """
    return get_strategy_performance_by_event(store)

@router.get("/recommendation/{case_id}", response_model=StrategyPerformanceRecommendation)
def read_strategy_performance_recommendation(case_id: uuid.UUID = Path(...)):
    """
    Returns an advisory combined strategy recommendation using F11 and F14 historical intelligence.
    """
    try:
        return get_strategy_recommendation(store, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{strategy_type}", response_model=StrategyOutcomeStatistics)
def read_strategy_performance_for_type(strategy_type: str = Path(...)):
    """
    Returns detailed statistics for one specific strategy.
    """
    perf = get_strategy_performance(store)
    for stat in perf.strategy_statistics:
        if stat.strategy_type == strategy_type:
            return stat
            
    raise HTTPException(status_code=404, detail="Strategy type not found in historical data.")

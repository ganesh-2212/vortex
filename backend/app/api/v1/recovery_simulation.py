from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, HTTPException

from app.models.domain import (
    SimulationRunRequest,
    SimulationRunResponse,
    SimulationStatistics,
)
from app.store import store
from app.services.recovery_simulator import run_simulation

router = APIRouter()


@router.post("/run", response_model=SimulationRunResponse)
async def run_recovery_simulation(payload: SimulationRunRequest):
    """
    Runs a deterministic simulation for a supplied batch of cases.
    If the batch list is empty, simulates all active open cases.
    """
    try:
        current_time = datetime.now(timezone.utc)
        result = run_simulation(
            store_inst=store,
            case_ids=payload.case_ids,
            current_time=current_time
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/latest", response_model=SimulationRunResponse)
async def get_latest_simulation():
    """
    Retrieves the latest executed simulation run.
    """
    latest = getattr(store, "latest_simulation", None)
    if not latest:
        raise HTTPException(status_code=404, detail="No simulation runs found.")
    return latest


@router.get("/statistics", response_model=SimulationStatistics)
async def get_simulation_statistics():
    """
    Retrieves aggregated simulation metrics across all completed simulation runs.
    """
    simulations = getattr(store, "simulations", {})
    if not simulations:
        return SimulationStatistics(
            simulations_run=0,
            total_cases_simulated=0,
            average_sentinel_recovery_rate=0.0,
            total_incremental_recovered_vs_basic=Decimal("0.00")
        )

    sims_list = list(simulations.values())
    simulations_run = len(sims_list)
    total_cases_simulated = sum(sim.number_of_simulated_cases for sim in sims_list)
    avg_rate = sum(sim.sentinel_recovery_rate for sim in sims_list) / simulations_run
    total_incremental = sum(sim.incremental_recovery_vs_basic_retry for sim in sims_list)

    return SimulationStatistics(
        simulations_run=simulations_run,
        total_cases_simulated=total_cases_simulated,
        average_sentinel_recovery_rate=round(avg_rate, 2),
        total_incremental_recovered_vs_basic=total_incremental.quantize(Decimal("0.01"))
    )

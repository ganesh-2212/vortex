from fastapi import APIRouter

from app.models.benchmark import BenchmarkRequest, BenchmarkResponse
from app.services.recovery_benchmark import run_benchmark

router = APIRouter()

@router.post("/run", response_model=BenchmarkResponse)
def execute_recovery_benchmark(request: BenchmarkRequest):
    """
    Executes a quantitative synthetic benchmark against VORTEX's Risk Engine, 
    Strategy Optimizer, and Guardrails.
    Returns deterministic aggregated metrics demonstrating recovery proof.
    """
    # Note: run_benchmark is deliberately synchronous and thread-safely isolates
    # the store context to prevent contaminating real Razorpay or demo cases.
    return run_benchmark(request)

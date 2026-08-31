import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel

class BenchmarkRequest(BaseModel):
    case_count: int = 500
    seed: int = 42

class StrategyComparison(BaseModel):
    name: str
    recovered_revenue: Decimal
    recovery_rate: float
    successful_recoveries: int

class BenchmarkSafety(BaseModel):
    guardrail_violations: int
    unsafe_actions_blocked: int
    human_escalations: int
    stopped_cases: int

class BenchmarkMetrics(BaseModel):
    cases_evaluated: int
    total_revenue_at_risk: Decimal
    recoverable_revenue: Decimal
    recovered_revenue: Decimal
    recovery_rate: float
    successful_recoveries: int
    failed_recoveries: int
    average_recovery_time_hours: float

class BenchmarkResponse(BaseModel):
    evaluation_id: uuid.UUID
    seed: int
    evaluated_at: datetime
    metrics: BenchmarkMetrics
    strategy_comparisons: List[StrategyComparison]
    safety: BenchmarkSafety

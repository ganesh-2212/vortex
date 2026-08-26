import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Optional

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryActionType,
    RecoveryActionStatus,
    RiskLevel,
    SimulatedCaseDetail,
    SimulationRunResponse,
)
from app.store import store, MemoryStore
from app.services.strategy_optimizer import optimize_strategy
from app.services.guardrails import evaluate_guardrails

# Dynamic setup for store simulations history
if not hasattr(store, "simulations"):
    store.simulations = {}
if not hasattr(store, "latest_simulation"):
    store.latest_simulation = None


def run_simulation(
    store_inst: MemoryStore = store,
    case_ids: Optional[List[uuid.UUID]] = None,
    current_time: Optional[datetime] = None
) -> SimulationRunResponse:
    """
    Runs a deterministic recovery simulation comparing No Intervention,
    Basic Retry, and Revenue Sentinel policies for a batch of cases.
    """
    if current_time is None:
        current_time = datetime.now(timezone.utc)
    elif current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    # 1. Fetch simulation batch cases
    active_statuses = {RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS, RecoveryCaseStatus.ESCALATED}
    if not case_ids:
        cases_to_sim = [c for c in store_inst.recovery_cases.values() if c.status in active_statuses]
    else:
        cases_to_sim = []
        for cid in case_ids:
            case = store_inst.recovery_cases.get(cid)
            if case:
                cases_to_sim.append(case)

    simulated_cases = []

    # 2. Simulate each case
    for case in cases_to_sim:
        amount = case.amount_at_risk

        # Handle zero/invalid amounts gracefully
        if amount <= 0:
            simulated_cases.append(
                SimulatedCaseDetail(
                    case_id=case.id,
                    amount_at_risk=amount,
                    risk_level=case.risk_level.value if hasattr(case.risk_level, "value") else str(case.risk_level),
                    no_intervention_recovered=Decimal("0.00"),
                    basic_retry_strategy="NO_INTERVENTION",
                    basic_retry_recovered=Decimal("0.00"),
                    basic_retry_cost=Decimal("0.00"),
                    sentinel_strategy="NO_INTERVENTION",
                    sentinel_probability=0,
                    sentinel_recovered=Decimal("0.00"),
                    sentinel_cost=Decimal("0.00"),
                    sentinel_net_recovered=Decimal("0.00"),
                    incremental_vs_no_intervention=Decimal("0.00"),
                    incremental_vs_basic_retry=Decimal("0.00"),
                    final_outcome="UNRESOLVED"
                )
            )
            continue

        # A. NO_INTERVENTION
        no_intervention_recovered = Decimal("0.00")

        # B. BASIC_RETRY
        # Retrieve retry history for the case to evaluate basic eligibility
        existing_actions = [a for a in store_inst.recovery_actions.values() if a.recovery_case_id == case.id]
        completed_retries = [
            a for a in existing_actions
            if a.action_type == RecoveryActionType.RETRY_PAYMENT
            and a.status in (RecoveryActionStatus.EXECUTED, RecoveryActionStatus.FAILED)
        ]
        retry_count = len(completed_retries)
        attempt_number = retry_count + 1

        # Check Merchant Config settings
        merchant = store_inst.merchants.get(case.merchant_id)
        max_retries = 3
        supported_actions = ["RETRY_PAYMENT"]
        recovery_enabled = True
        if merchant:
            max_retries = getattr(merchant, "max_retry_attempts", 3)
            supported_actions = getattr(merchant, "supported_recovery_actions", supported_actions)
            recovery_enabled = getattr(merchant, "recovery_enabled", True)

        # Check guardrails cooldown
        guardrail_res = evaluate_guardrails(
            case=case,
            action_type=RecoveryActionType.RETRY_PAYMENT,
            attempt_number=attempt_number,
            existing_actions=existing_actions,
            current_time=current_time
        )

        basic_eligible = (
            recovery_enabled
            and "RETRY_PAYMENT" in supported_actions
            and retry_count < max_retries
            and guardrail_res.is_allowed
        )

        if basic_eligible:
            basic_retry_strategy = "IMMEDIATE_RETRY"
            basic_retry_cost = Decimal("5.00")
            # Deterministic basic retry probability
            prob = 50
            prob -= retry_count * 10
            if case.risk_level == RiskLevel.CRITICAL:
                prob -= 20
            elif case.risk_level == RiskLevel.LOW:
                prob -= 10
            prob = max(0, min(100, prob))
            basic_retry_recovered = (amount * Decimal(str(prob)) / Decimal("100")).quantize(Decimal("0.01"))
        else:
            basic_retry_strategy = "NO_INTERVENTION"
            basic_retry_cost = Decimal("0.00")
            basic_retry_recovered = Decimal("0.00")

        # C. REVENUE_SENTINEL
        # Guard against resolved/terminal cases inside strategy optimizer
        if case.status in (RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.STOPPED):
            sentinel_strategy = "NO_INTERVENTION"
            sentinel_probability = 0
            sentinel_recovered = Decimal("0.00")
            sentinel_cost = Decimal("0.00")
            sentinel_net_recovered = Decimal("0.00")
            final_outcome = case.status.value
        else:
            try:
                res = optimize_strategy(store_inst, case, current_time)
                sentinel_strategy = res.recommended_strategy
                sentinel_probability = res.recovery_probability
                sentinel_recovered = res.expected_recovery_amount
                sentinel_cost = next(
                    (s.intervention_cost for s in res.strategies if s.strategy_name == res.recommended_strategy),
                    Decimal("0.00")
                )
                sentinel_net_recovered = res.expected_net_recovery
                final_outcome = "RECOVERED" if sentinel_probability >= 40 else "UNRESOLVED"
            except ValueError:
                sentinel_strategy = "NO_INTERVENTION"
                sentinel_probability = 0
                sentinel_recovered = Decimal("0.00")
                sentinel_cost = Decimal("0.00")
                sentinel_net_recovered = Decimal("0.00")
                final_outcome = "UNRESOLVED"

        incremental_vs_no_intervention = sentinel_recovered - no_intervention_recovered
        incremental_vs_basic_retry = sentinel_recovered - basic_retry_recovered

        simulated_cases.append(
            SimulatedCaseDetail(
                case_id=case.id,
                amount_at_risk=amount,
                risk_level=case.risk_level.value if hasattr(case.risk_level, "value") else str(case.risk_level),
                no_intervention_recovered=no_intervention_recovered.quantize(Decimal("0.01")),
                basic_retry_strategy=basic_retry_strategy,
                basic_retry_recovered=basic_retry_recovered.quantize(Decimal("0.01")),
                basic_retry_cost=basic_retry_cost.quantize(Decimal("0.01")),
                sentinel_strategy=sentinel_strategy,
                sentinel_probability=sentinel_probability,
                sentinel_recovered=sentinel_recovered.quantize(Decimal("0.01")),
                sentinel_cost=sentinel_cost.quantize(Decimal("0.01")),
                sentinel_net_recovered=sentinel_net_recovered.quantize(Decimal("0.01")),
                incremental_vs_no_intervention=incremental_vs_no_intervention.quantize(Decimal("0.01")),
                incremental_vs_basic_retry=incremental_vs_basic_retry.quantize(Decimal("0.01")),
                final_outcome=final_outcome
            )
        )

    # 3. Calculate Batch Metrics
    total_revenue_at_risk = sum(c.amount_at_risk for c in simulated_cases)
    no_intervention_recovered_amount = sum(c.no_intervention_recovered for c in simulated_cases)
    basic_retry_recovered_amount = sum(c.basic_retry_recovered for c in simulated_cases)
    sentinel_recovered_amount = sum(c.sentinel_recovered for c in simulated_cases)
    total_intervention_cost = sum(c.sentinel_cost for c in simulated_cases)
    sentinel_net_recovery = sentinel_recovered_amount - total_intervention_cost

    sentinel_recovery_rate = float(
        (sentinel_recovered_amount / total_revenue_at_risk) * 100
    ) if total_revenue_at_risk > 0 else 0.0

    incremental_recovery_vs_no_intervention = sentinel_recovered_amount - no_intervention_recovered_amount
    incremental_recovery_vs_basic_retry = sentinel_recovered_amount - basic_retry_recovered_amount

    additional_recovery_percentage = float(
        (incremental_recovery_vs_basic_retry / basic_retry_recovered_amount) * 100
    ) if basic_retry_recovered_amount > 0 else 0.0

    number_of_simulated_cases = len(simulated_cases)
    number_of_simulated_successful_recoveries = sum(1 for c in simulated_cases if c.final_outcome == "RECOVERED")

    # Build response object
    sim_id = uuid.uuid4()
    response = SimulationRunResponse(
        simulation_id=sim_id,
        total_revenue_at_risk=total_revenue_at_risk.quantize(Decimal("0.01")),
        no_intervention_recovered_amount=no_intervention_recovered_amount.quantize(Decimal("0.01")),
        basic_retry_recovered_amount=basic_retry_recovered_amount.quantize(Decimal("0.01")),
        sentinel_recovered_amount=sentinel_recovered_amount.quantize(Decimal("0.01")),
        sentinel_recovery_rate=round(sentinel_recovery_rate, 2),
        incremental_recovery_vs_no_intervention=incremental_recovery_vs_no_intervention.quantize(Decimal("0.01")),
        incremental_recovery_vs_basic_retry=incremental_recovery_vs_basic_retry.quantize(Decimal("0.01")),
        additional_recovery_percentage=round(additional_recovery_percentage, 2),
        total_intervention_cost=total_intervention_cost.quantize(Decimal("0.01")),
        sentinel_net_recovery=sentinel_net_recovery.quantize(Decimal("0.01")),
        number_of_simulated_cases=number_of_simulated_cases,
        number_of_simulated_successful_recoveries=number_of_simulated_successful_recoveries,
        cases=simulated_cases,
        run_at=current_time
    )

    # 4. Save to MemoryStore history
    store_inst.simulations[sim_id] = response
    store_inst.latest_simulation = response

    return response

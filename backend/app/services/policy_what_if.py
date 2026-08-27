import copy
import uuid
from decimal import Decimal

from app.models.domain import WhatIfResult, WhatIfComparison
from app.store import MemoryStore, store as global_store
from app.services.recovery_simulator import calculate_simulation

def clone_isolated_sandbox(original: MemoryStore) -> MemoryStore:
    """
    Creates a deep/independent clone for all mutable store collections.
    Changes made inside this sandbox will never affect the original store.
    """
    sandbox = MemoryStore()
    sandbox.merchants = copy.deepcopy(original.merchants)
    sandbox.customers = copy.deepcopy(original.customers)
    sandbox.revenue_events = copy.deepcopy(original.revenue_events)
    sandbox.recovery_cases = copy.deepcopy(original.recovery_cases)
    sandbox.recovery_actions = copy.deepcopy(original.recovery_actions)
    sandbox.audit_logs = copy.deepcopy(original.audit_logs)
    if hasattr(original, "simulations"):
        sandbox.simulations = copy.deepcopy(original.simulations)
    else:
        sandbox.simulations = {}
        
    if hasattr(original, "latest_simulation"):
        sandbox.latest_simulation = copy.deepcopy(original.latest_simulation)
    else:
        sandbox.latest_simulation = None
        
    return sandbox

def extract_what_if_result(simulation_response) -> WhatIfResult:
    return WhatIfResult(
        cases_evaluated=simulation_response.number_of_simulated_cases,
        total_revenue_at_risk=simulation_response.total_revenue_at_risk,
        projected_recovery=simulation_response.sentinel_recovered_amount,
        intervention_count=simulation_response.number_of_simulated_successful_recoveries,
        intervention_cost=simulation_response.total_intervention_cost,
        net_recovery=simulation_response.sentinel_net_recovery,
        recovery_rate=simulation_response.sentinel_recovery_rate
    )

def run_policy_what_if(
    merchant_id: uuid.UUID,
    proposed_retries: int,
    store_inst: MemoryStore = global_store
) -> WhatIfComparison:
    """
    Evaluates current vs proposed policy strictly in isolated sandboxes.
    """
    # 1. Validation & Safety (F10 authoritative limit checks)
    if proposed_retries < 0:
        raise ValueError("INVALID: Proposed retry limit cannot be negative.")
        
    merchant = store_inst.merchants.get(merchant_id)
    if not merchant:
        raise ValueError("Merchant not found")

    # 2. Create isolated sandboxes
    current_sandbox = clone_isolated_sandbox(store_inst)
    proposed_sandbox = clone_isolated_sandbox(store_inst)

    # Apply proposed policy ONLY to the proposed sandbox
    proposed_sandbox.merchants[merchant_id].max_retry_attempts = proposed_retries

    # 3. Shared Deterministic Recovery Calculation
    current_sim = calculate_simulation(current_sandbox)
    proposed_sim = calculate_simulation(proposed_sandbox)

    # 4. Compare Results
    current_result = extract_what_if_result(current_sim)
    proposed_result = extract_what_if_result(proposed_sim)

    revenue_impact = proposed_result.projected_recovery - current_result.projected_recovery
    cost_impact = proposed_result.intervention_cost - current_result.intervention_cost
    net_recovery_impact = proposed_result.net_recovery - current_result.net_recovery
    recovery_rate_impact = round(proposed_result.recovery_rate - current_result.recovery_rate, 2)

    # 5. Assessment rules
    if net_recovery_impact > 0:
        assessment = "FAVORABLE"
        explanation = f"FAVORABLE\n\nChanging the retry limit is projected to increase net recovery by ₹{net_recovery_impact:,.2f} across the current case population."
    elif net_recovery_impact < 0:
        assessment = "UNFAVORABLE"
        explanation = f"UNFAVORABLE\n\nChanging the retry limit is projected to decrease net recovery by ₹{abs(net_recovery_impact):,.2f} across the current case population."
    else:
        assessment = "NEUTRAL"
        explanation = f"NEUTRAL\n\nChanging the retry limit has no material projected impact on net recovery."

    return WhatIfComparison(
        current_result=current_result,
        proposed_result=proposed_result,
        revenue_impact=revenue_impact,
        cost_impact=cost_impact,
        net_recovery_impact=net_recovery_impact,
        recovery_rate_impact=recovery_rate_impact,
        assessment=assessment,
        explanation=explanation
    )

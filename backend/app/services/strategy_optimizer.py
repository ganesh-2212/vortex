import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Optional

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
    RiskLevel,
    StrategyOption,
    StrategyOptimizationResponse,
    StrategyStatistics,
)
from app.store import MemoryStore
from app.services.guardrails import evaluate_guardrails
from app.services.intelligence import get_single_case_intelligence


def optimize_strategy(
    store: MemoryStore,
    case: RecoveryCase,
    current_time: datetime
) -> StrategyOptimizationResponse:
    """
    Evaluates multiple recovery strategies for an active recovery case,
    calculates expected net recovery values, and selects the optimal recommended strategy.
    """
    # 1. Block terminal cases from receiving strategies
    if case.status in (RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.STOPPED):
        raise ValueError("Strategy optimization is only available for active cases")

    # Ensure timezone aware current_time
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    # 2. Retrieve case intelligence metrics
    intel = get_single_case_intelligence(case.id, store, current_time)
    if not intel:
        raise ValueError("Failed to retrieve case intelligence telemetry")

    # 3. Retrieve retry attempts history
    existing_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
    completed_retries = [
        a for a in existing_actions
        if a.action_type == RecoveryActionType.RETRY_PAYMENT
        and a.status in (RecoveryActionStatus.EXECUTED, RecoveryActionStatus.FAILED)
    ]
    retry_count = len(completed_retries)
    attempt_number = retry_count + 1

    # Load merchant configuration settings
    merchant = store.merchants.get(case.merchant_id)
    max_retries = 3
    supported_actions = ["RETRY_PAYMENT", "SEND_REMINDER", "OFFER_ALTERNATIVE_METHOD", "ESCALATE_TO_HUMAN", "STOP_RECOVERY"]
    if merchant:
        max_retries = getattr(merchant, "max_retry_attempts", 3)
        supported_actions = getattr(merchant, "supported_recovery_actions", supported_actions)

    # Check cooldown active for RETRY_PAYMENT
    immediate_guardrail = evaluate_guardrails(
        case=case,
        action_type=RecoveryActionType.RETRY_PAYMENT,
        attempt_number=attempt_number,
        existing_actions=existing_actions,
        current_time=current_time
    )
    is_cooldown_active = False
    if not immediate_guardrail.is_allowed:
        if "cooldown" in immediate_guardrail.reason.lower() or "try again" in immediate_guardrail.reason.lower():
            is_cooldown_active = True

    # Age category from time sensitivity
    age_category = intel.time_sensitivity.category

    # Define strategy candidates
    strategies_to_evaluate = [
        "IMMEDIATE_RETRY",
        "DELAYED_RETRY",
        "ALTERNATE_PAYMENT",
        "ESCALATE_TO_HUMAN",
        "NO_INTERVENTION"
    ]

    strategy_options = []

    for strat_name in strategies_to_evaluate:
        eligible = True
        guardrail_status = "ALLOWED"
        reasons = []
        intervention_cost = Decimal("0.00")
        probability = 0
        confidence = 50

        # Eligibility & Guardrail checks
        if strat_name == "NO_INTERVENTION":
            eligible = True
            guardrail_status = "ALLOWED"
            reasons.append("No-intervention fallback option is always allowed.")
            intervention_cost = Decimal("0.00")
            probability = 0
            # Higher confidence if retries are already exhausted
            if retry_count >= max_retries:
                confidence = 100
                reasons.append("Retries are exhausted. Stopping intervention is recommended.")
            else:
                confidence = 50

        elif strat_name == "IMMEDIATE_RETRY":
            intervention_cost = Decimal("5.00")
            if "RETRY_PAYMENT" not in supported_actions:
                eligible = False
                guardrail_status = "BLOCKED"
                reasons.append("Retry payment is disabled in merchant configuration settings.")
            elif retry_count >= max_retries:
                eligible = False
                guardrail_status = "BLOCKED"
                reasons.append("Maximum retry attempts already reached.")
            else:
                eligible = immediate_guardrail.is_allowed
                guardrail_status = "ALLOWED" if eligible else "BLOCKED"
                reasons.append(immediate_guardrail.reason)

            if eligible:
                # Probability logic
                base_prob = 70
                if case.risk_level == RiskLevel.CRITICAL:
                    base_prob -= 30
                    reasons.append("Critical risk level: reduced probability for immediate retry to protect cardholder safety.")
                elif case.risk_level == RiskLevel.HIGH:
                    base_prob += 10
                    reasons.append("High risk exposure increases retry weight.")
                elif case.risk_level == RiskLevel.LOW:
                    base_prob -= 20
                    reasons.append("Low transaction value slightly lowers recovery likelihood.")

                # Failure history adjust
                fail_penalty = retry_count * 15
                base_prob -= fail_penalty
                if fail_penalty > 0:
                    reasons.append(f"Penalty applied for {retry_count} previous failed attempts (-{fail_penalty}%).")

                # Age adjust
                if age_category in ("AGING", "STALE"):
                    base_prob -= 20
                    reasons.append("Case age is aging/stale: lowers immediate retry success rate.")

                probability = max(0, min(100, base_prob))

                # Confidence logic
                base_conf = 80
                if case.risk_level == RiskLevel.CRITICAL:
                    base_conf -= 30
                base_conf -= retry_count * 10
                confidence = max(0, min(100, base_conf))
            else:
                probability = 0
                confidence = 0

        elif strat_name == "DELAYED_RETRY":
            intervention_cost = Decimal("5.00")
            # Eligible if retry is enabled and not exhausted, even if in cooldown right now
            if "RETRY_PAYMENT" not in supported_actions:
                eligible = False
                guardrail_status = "BLOCKED"
                reasons.append("Retry payment is disabled in merchant configuration settings.")
            elif retry_count >= max_retries:
                eligible = False
                guardrail_status = "BLOCKED"
                reasons.append("Maximum retry attempts already reached.")
            else:
                eligible = True
                guardrail_status = "ALLOWED"
                if is_cooldown_active:
                    reasons.append("Delayed retry planned after current active cooldown period expires.")
                else:
                    reasons.append("Delayed retry is permitted if immediate attempt is deferred.")

            if eligible:
                base_prob = 60
                if case.risk_level == RiskLevel.CRITICAL:
                    base_prob -= 20
                    reasons.append("Critical risk: reduced probability for retries.")
                elif case.risk_level == RiskLevel.HIGH:
                    base_prob += 10
                elif case.risk_level == RiskLevel.LOW:
                    base_prob -= 15

                base_prob -= retry_count * 10
                if retry_count > 0:
                    reasons.append(f"Adjusted for {retry_count} previous failures.")

                if is_cooldown_active:
                    base_prob += 15
                    reasons.append("Wait duration increases probability by letting cardholder replenish funds (+15%).")

                probability = max(0, min(100, base_prob))

                base_conf = 75
                if is_cooldown_active:
                    base_conf += 10
                base_conf -= retry_count * 5
                confidence = max(0, min(100, base_conf))
            else:
                probability = 0
                confidence = 0

        elif strat_name == "ALTERNATE_PAYMENT":
            intervention_cost = Decimal("15.00")
            # Offer alternative method check
            if "OFFER_ALTERNATIVE_METHOD" not in supported_actions and "SEND_PAYMENT_LINK" not in supported_actions:
                eligible = False
                guardrail_status = "BLOCKED"
                reasons.append("Alternative payment methods are not enabled in merchant settings.")
            else:
                eligible = True
                guardrail_status = "ALLOWED"
                reasons.append("Alternative payment method option is active.")

            if eligible:
                base_prob = 50
                if case.risk_level == RiskLevel.HIGH:
                    base_prob += 10
                if retry_count >= 2:
                    base_prob += 15
                    reasons.append("Multiple failed card retries: alternate payment channel probability increases (+15%).")

                probability = max(0, min(100, base_prob))
                confidence = 70
            else:
                probability = 0
                confidence = 0

        elif strat_name == "ESCALATE_TO_HUMAN":
            intervention_cost = Decimal("100.00")
            if "ESCALATE_TO_HUMAN" not in supported_actions:
                eligible = False
                guardrail_status = "BLOCKED"
                reasons.append("Human escalation is disabled in merchant configuration settings.")
            else:
                eligible = True
                guardrail_status = "ALLOWED"
                reasons.append("Human support queue escalation is allowed.")

            if eligible:
                if case.risk_level == RiskLevel.CRITICAL or retry_count >= 2:
                    base_prob = 65
                    reasons.append("Critical risk or multiple retry failures: human touch yields high recovery rates.")
                else:
                    base_prob = 40

                if case.risk_level == RiskLevel.LOW:
                    base_prob -= 10

                probability = max(0, min(100, base_prob))
                confidence = 85
                if case.risk_level == RiskLevel.CRITICAL:
                    confidence += 5
                confidence = max(0, min(100, confidence))
            else:
                probability = 0
                confidence = 0

        # Expected Recovery and Net Recovery
        expected_recovery_amount = case.amount_at_risk * Decimal(str(probability)) / Decimal("100")
        expected_net_recovery = expected_recovery_amount - intervention_cost

        strategy_options.append(
            StrategyOption(
                strategy_name=strat_name,
                eligible=eligible,
                guardrail_status=guardrail_status,
                recovery_probability=probability,
                expected_recovery_amount=expected_recovery_amount.quantize(Decimal("0.01")),
                intervention_cost=intervention_cost.quantize(Decimal("0.01")),
                expected_net_recovery=expected_net_recovery.quantize(Decimal("0.01")),
                confidence=confidence,
                reasons=reasons,
                executable=False if strat_name == "ALTERNATE_PAYMENT" else True
            )
        )

    # 4. Strategy Selection & Ranking
    # Filter to eligible/ALLOWED strategies only
    eligible_options = [opt for opt in strategy_options if opt.guardrail_status == "ALLOWED"]

    if not eligible_options:
        # Fallback to NO_INTERVENTION (which is always allowed)
        selected = [opt for opt in strategy_options if opt.strategy_name == "NO_INTERVENTION"][0]
    else:
        # Rank by:
        # 1. Highest expected net recovery
        # 2. Highest confidence
        # 3. Lowest cost
        eligible_options.sort(
            key=lambda x: (x.expected_net_recovery, x.confidence, -x.intervention_cost),
            reverse=True
        )
        selected = eligible_options[0]

    return StrategyOptimizationResponse(
        case_id=case.id,
        amount_at_risk=case.amount_at_risk,
        recommended_strategy=selected.strategy_name,
        recovery_probability=selected.recovery_probability,
        expected_recovery_amount=selected.expected_recovery_amount,
        expected_net_recovery=selected.expected_net_recovery,
        confidence=selected.confidence,
        guardrail_status=selected.guardrail_status,
        reasons=selected.reasons,
        strategies=strategy_options,
        generated_at=current_time
    )


def optimize_all_strategies(
    store: MemoryStore,
    current_time: datetime
) -> List[StrategyOptimizationResponse]:
    """
    Optimizes and calculates strategy recommendations for all active open cases.
    """
    active_statuses = {RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS, RecoveryCaseStatus.ESCALATED}
    active_cases = [c for c in store.recovery_cases.values() if c.status in active_statuses]
    
    responses = []
    for case in active_cases:
        try:
            res = optimize_strategy(store, case, current_time)
            responses.append(res)
        except ValueError:
            continue

    # Sort responses by expected net recovery descending
    responses.sort(key=lambda x: x.expected_net_recovery, reverse=True)
    return responses


def get_strategy_statistics(
    store: MemoryStore,
    current_time: datetime
) -> StrategyStatistics:
    """
    Aggregates strategy recommendation statistics across all active recovery cases.
    """
    active_statuses = {RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS, RecoveryCaseStatus.ESCALATED}
    active_cases = [c for c in store.recovery_cases.values() if c.status in active_statuses]

    cases_optimized = 0
    total_expected_recovery = Decimal("0.00")
    strategy_counts = {
        "IMMEDIATE_RETRY": 0,
        "DELAYED_RETRY": 0,
        "ALTERNATE_PAYMENT": 0,
        "ESCALATE_TO_HUMAN": 0,
        "NO_INTERVENTION": 0
    }
    total_confidence = 0

    for case in active_cases:
        try:
            res = optimize_strategy(store, case, current_time)
            cases_optimized += 1
            total_expected_recovery += res.expected_recovery_amount
            strategy_counts[res.recommended_strategy] = strategy_counts.get(res.recommended_strategy, 0) + 1
            total_confidence += res.confidence
        except ValueError:
            continue

    avg_confidence = float(total_confidence) / cases_optimized if cases_optimized > 0 else 0.0

    return StrategyStatistics(
        cases_optimized=cases_optimized,
        total_expected_recovery=total_expected_recovery.quantize(Decimal("0.01")),
        strategy_counts=strategy_counts,
        average_confidence=round(avg_confidence, 2)
    )

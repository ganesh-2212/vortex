from datetime import datetime, timezone
import uuid
from decimal import Decimal
from typing import List, Dict, Tuple, Optional

from app.store import MemoryStore
from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RecoveryAction,
    RecoveryActionType,
    RecoveryActionStatus,
    StrategyOutcomeStatistics,
    StrategyPerformance,
    StrategyPerformanceResponse,
    EventStrategyPerformance,
    StrategyPerformanceRecommendation,
)
from app.services.strategy_optimizer import optimize_strategy

INTERVENTION_COSTS = {
    "IMMEDIATE_RETRY": Decimal("5.00"),
    "DELAYED_RETRY": Decimal("5.00"),
    "ALTERNATE_PAYMENT": Decimal("15.00"),
    "ESCALATE_TO_HUMAN": Decimal("100.00"),
    "NO_INTERVENTION": Decimal("0.00")
}

def _calculate_base_stats(store: MemoryStore, event_filter: Optional[str] = None) -> Tuple[Dict[str, StrategyOutcomeStatistics], int, Decimal, Decimal]:
    """
    Computes base historical statistics directly from store actions and cases.
    Optionally filters by the originating revenue event type.
    """
    stats_map = {
        strat: StrategyOutcomeStatistics(
            strategy_type=strat,
            total_attempts=0,
            successful_attempts=0,
            failed_attempts=0,
            success_rate=0.0,
            total_recovered=Decimal("0.00"),
            average_recovered=Decimal("0.00"),
            total_cost=Decimal("0.00"),
            net_recovery=Decimal("0.00"),
            average_attempts_to_recovery=0.0,
            expected_recovery=Decimal("0.00"),
            actual_recovery=Decimal("0.00"),
            recovery_variance=Decimal("0.00")
        ) for strat in INTERVENTION_COSTS.keys()
    }
    
    analyzed_cases = set()
    total_risk = Decimal("0.00")
    total_recovered = Decimal("0.00")
    
    # We trace which case had which actions and whether it was recovered
    case_actions_map: Dict[uuid.UUID, List[RecoveryAction]] = {}
    for action in store.recovery_actions.values():
        if action.status in (RecoveryActionStatus.EXECUTED, RecoveryActionStatus.FAILED):
            if action.recovery_case_id not in case_actions_map:
                case_actions_map[action.recovery_case_id] = []
            case_actions_map[action.recovery_case_id].append(action)

    for case_id, actions in case_actions_map.items():
        case = store.recovery_cases.get(case_id)
        if not case:
            continue
            
        if event_filter:
            evt = store.revenue_events.get(case.revenue_event_id)
            if not evt or evt.event_type.value != event_filter:
                continue
                
        analyzed_cases.add(case_id)
        is_recovered = case.status == RecoveryCaseStatus.RECOVERED
        
        # Sort actions by time to determine attempts order
        actions.sort(key=lambda x: x.created_at)
        
        for idx, act in enumerate(actions):
            # Map action type to strategy roughly
            strat_name = "IMMEDIATE_RETRY" if act.attempt_number == 1 and act.action_type == RecoveryActionType.RETRY_PAYMENT else \
                         "DELAYED_RETRY" if act.attempt_number > 1 and act.action_type == RecoveryActionType.RETRY_PAYMENT else \
                         "ESCALATE_TO_HUMAN" if act.action_type == RecoveryActionType.ESCALATE_TO_HUMAN else \
                         "ALTERNATE_PAYMENT" if act.action_type == RecoveryActionType.OFFER_ALTERNATIVE_METHOD else None
            
            if not strat_name:
                continue
                
            stat = stats_map[strat_name]
            stat.total_attempts += 1
            cost = INTERVENTION_COSTS.get(strat_name, Decimal("0.00"))
            stat.total_cost += cost
            
            if act.status == RecoveryActionStatus.EXECUTED:
                # To consider an action genuinely successful, the case must be RECOVERED
                # AND this action must be the final executed action (the causal action).
                if is_recovered and idx == len(actions) - 1:
                    stat.successful_attempts += 1
                    rec_amount = case.amount_at_risk  # Assume full recovery on success for simplicity
                    stat.total_recovered += rec_amount
                    total_recovered += rec_amount
                    # Expected recovery logic: a simplification for variance tracking
                    expected_rec = (rec_amount * Decimal("0.70")).quantize(Decimal("0.01"))
                    stat.expected_recovery += expected_rec
                    stat.actual_recovery += rec_amount
                    
                    # average attempts to recovery sum
                    stat.average_attempts_to_recovery += act.attempt_number
                else:
                    stat.failed_attempts += 1
                    stat.actual_recovery += Decimal("0.00")
                    expected_rec = (case.amount_at_risk * Decimal("0.70")).quantize(Decimal("0.01"))
                    stat.expected_recovery += expected_rec
            else:
                stat.failed_attempts += 1
                stat.actual_recovery += Decimal("0.00")
                expected_rec = (case.amount_at_risk * Decimal("0.70")).quantize(Decimal("0.01"))
                stat.expected_recovery += expected_rec
                
    for case_id in analyzed_cases:
        case = store.recovery_cases[case_id]
        total_risk += case.amount_at_risk
                
    for strat, stat in stats_map.items():
        if stat.total_attempts > 0:
            stat.success_rate = round((stat.successful_attempts / stat.total_attempts) * 100, 2)
        if stat.successful_attempts > 0:
            stat.average_recovered = (stat.total_recovered / stat.successful_attempts).quantize(Decimal("0.01"))
            stat.average_attempts_to_recovery = round(stat.average_attempts_to_recovery / stat.successful_attempts, 2)
            
        stat.net_recovery = stat.total_recovered - stat.total_cost
        stat.recovery_variance = stat.actual_recovery - stat.expected_recovery
        
    return stats_map, len(analyzed_cases), total_risk, total_recovered

def get_strategy_performance(store: MemoryStore) -> StrategyPerformanceResponse:
    stats_map, analyzed, total_risk, total_rec = _calculate_base_stats(store)
    
    overall_rate = 0.0
    if total_risk > Decimal("0"):
        overall_rate = round(float((total_rec / total_risk) * 100), 2)
        
    stats_list = list(stats_map.values())
    
    best_strategy = "NO_INTERVENTION"
    strongest_rev = "NO_INTERVENTION"
    strongest_rate = "NO_INTERVENTION"
    
    valid_strats = [s for s in stats_list if s.total_attempts >= 3]
    if valid_strats:
        # Score calculation: 60% net recovery, 40% success rate
        max_net = max((s.net_recovery for s in valid_strats), default=Decimal("1.00"))
        if max_net <= Decimal("0"):
            max_net = Decimal("1.00")
            
        for s in valid_strats:
            score = float(s.success_rate * 0.4) + float((s.net_recovery / max_net) * Decimal("100") * Decimal("0.6"))
            # attached as a temp property to sort
            s.__dict__["_temp_score"] = score
            
        best = max(valid_strats, key=lambda x: getattr(x, "_temp_score", 0))
        best_strategy = best.strategy_type
        
        strongest_rev = max(valid_strats, key=lambda x: x.net_recovery).strategy_type
        strongest_rate = max(valid_strats, key=lambda x: x.success_rate).strategy_type

    return StrategyPerformanceResponse(
        generated_at=datetime.now(timezone.utc),
        total_cases_analyzed=analyzed,
        total_revenue_at_risk=total_risk,
        total_revenue_recovered=total_rec,
        overall_recovery_rate=overall_rate,
        strategy_statistics=stats_list,
        best_strategy=best_strategy,
        strongest_strategy_by_revenue=strongest_rev,
        strongest_strategy_by_success_rate=strongest_rate
    )

def get_strategy_performance_by_event(store: MemoryStore) -> List[EventStrategyPerformance]:
    # Group actions by event type via case -> event
    # Simplification: returning generic grouping
    events_found = set()
    for case in store.recovery_cases.values():
        evt = store.revenue_events.get(case.revenue_event_id)
        if evt:
            events_found.add(evt.event_type.value)
            
    # Filter per event type logic
    result = []
    
    for evt in events_found:
        stats_map, _, _, _ = _calculate_base_stats(store, event_filter=evt)
        stats_list = list(stats_map.values())
        
        valid = [s for s in stats_list if s.total_attempts >= 3]
        if valid:
            best = max(valid, key=lambda x: x.success_rate).strategy_type
            rate = max(valid, key=lambda x: x.success_rate).success_rate
            net = max(valid, key=lambda x: x.success_rate).net_recovery
        else:
            best = "NO_INTERVENTION"
            rate = 0.0
            net = Decimal("0.00")
            
        result.append(EventStrategyPerformance(
            event_type=evt,
            total_cases=len([c for c in store.recovery_cases.values() if store.revenue_events.get(c.revenue_event_id) and store.revenue_events[c.revenue_event_id].event_type.value == evt]),
            best_strategy=best,
            best_strategy_success_rate=rate,
            best_strategy_net_recovery=net,
            strategy_breakdown=stats_list
        ))
        
    return result

def get_strategy_recommendation(store: MemoryStore, case_id: uuid.UUID) -> StrategyPerformanceRecommendation:
    case = store.recovery_cases.get(case_id)
    if not case:
        raise ValueError("Case not found")
        
    current_time = datetime.now(timezone.utc)
    f11_res = optimize_strategy(store, case, current_time)
    f11_strategy = f11_res.recommended_strategy
    
    stats_map, _, _, _ = _calculate_base_stats(store)
    
    valid_strats = [s for s in stats_map.values() if s.total_attempts >= 5]
    
    if not valid_strats:
        return StrategyPerformanceRecommendation(
            case_id=case_id,
            f11_baseline_strategy=f11_strategy,
            historical_best_strategy="N/A",
            combined_advisory_strategy=f11_strategy,
            confidence=f11_res.confidence,
            sample_size=0,
            explanation=f"Insufficient historical data (N<5). Relying on F11 baseline: {f11_strategy}",
            fallback_reason="INSUFFICIENT_SAMPLE_SIZE"
        )
        
    best_hist = max(valid_strats, key=lambda x: x.net_recovery)
    
    # Check if historical best is allowed by F11 guardrails
    hist_is_allowed = False
    for opt in f11_res.strategies:
        if opt.strategy_name == best_hist.strategy_type and opt.guardrail_status == "ALLOWED":
            hist_is_allowed = True
            break
            
    combined = f11_strategy
    reason = f"F11 recommends {f11_strategy} and historical data supports it."
    
    if best_hist.strategy_type != f11_strategy:
        if hist_is_allowed:
            combined = best_hist.strategy_type
            reason = f"Historical data overrides F11. {best_hist.strategy_type} historically recovers highest net value."
        else:
            reason = f"Historical best {best_hist.strategy_type} is blocked by guardrails. Falling back to F11: {f11_strategy}."
            
    return StrategyPerformanceRecommendation(
        case_id=case_id,
        f11_baseline_strategy=f11_strategy,
        historical_best_strategy=best_hist.strategy_type,
        combined_advisory_strategy=combined,
        confidence=min(100, f11_res.confidence + 10),
        sample_size=best_hist.total_attempts,
        explanation=reason
    )

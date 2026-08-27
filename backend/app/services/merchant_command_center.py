from datetime import datetime, timezone, timedelta
import uuid
from decimal import Decimal
from typing import List, Optional

from app.store import MemoryStore
from app.models.domain import (
    MerchantCommandCenterResponse,
    CommandCenterMetrics,
    RevenueComparisonMetrics,
    RecoveryQueueSummary,
    RecoveryQueueItem,
    HumanAttentionSummary,
    RevenueTrendPoint,
    StrategyPerformanceSummary,
    RecoveryCaseStatus,
    RecoveryActionStatus,
    RiskLevel
)
from app.services.strategy_performance import get_strategy_performance
from app.services.recovery_orchestrator import evaluate_orchestration

def build_command_center(store: MemoryStore, merchant_id: uuid.UUID) -> MerchantCommandCenterResponse:
    current_time = datetime.now(timezone.utc)
    
    # 1. Base Iterations
    total_revenue_at_risk = Decimal("0.00")
    total_recoverable_revenue = Decimal("0.00")
    total_confirmed_recovered = Decimal("0.00")
    
    total_cases = 0
    active_cases = 0
    recovered_cases = 0
    stopped_cases = 0
    expired_cases = 0
    
    # Track actions
    total_actions = 0
    successful_actions = 0
    failed_actions = 0
    blocked_actions = 0
    scheduled_actions = 0
    
    # For queue & attention
    queue_items = []
    attention_items = []
    
    merchant_cases = [c for c in store.recovery_cases.values() if c.merchant_id == merchant_id]
    total_cases = len(merchant_cases)
    
    for case in merchant_cases:
        # Case Status Counts
        if case.status in (RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS, RecoveryCaseStatus.ESCALATED):
            active_cases += 1
            total_revenue_at_risk += case.amount_at_risk
            total_recoverable_revenue += (case.amount_at_risk - case.recovered_amount)
        elif case.status == RecoveryCaseStatus.RECOVERED:
            recovered_cases += 1
            total_confirmed_recovered += case.recovered_amount
        elif case.status == RecoveryCaseStatus.STOPPED:
            stopped_cases += 1
            
        # Action stats for this case
        case_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
        total_actions += len(case_actions)
        for act in case_actions:
            if act.status == RecoveryActionStatus.EXECUTED:
                successful_actions += 1
            elif act.status == RecoveryActionStatus.FAILED:
                failed_actions += 1
            elif act.status == RecoveryActionStatus.BLOCKED:
                blocked_actions += 1
            elif act.status == RecoveryActionStatus.PROPOSED or act.status == RecoveryActionStatus.ALLOWED:
                scheduled_actions += 1
                
        # Active Queue & Orchestration
        if case.status in (RecoveryCaseStatus.OPEN, RecoveryCaseStatus.IN_PROGRESS, RecoveryCaseStatus.ESCALATED):
            # Run orchestration read-only to determine next action
            orch = evaluate_orchestration(case.id, store, current_time)
            
            # Queue Priority
            priority = 100
            if case.risk_level == RiskLevel.CRITICAL:
                priority = 10
            elif case.risk_level == RiskLevel.HIGH:
                priority = 20
            elif orch.human_escalation_required:
                priority = 30
            elif case.amount_at_risk >= Decimal("10000.00"):
                priority = 40
            else:
                priority = 50
                
            queue_items.append(RecoveryQueueItem(
                case_id=case.id,
                customer_id=case.customer_id,
                amount=case.amount_at_risk,
                risk_level=case.risk_level,
                case_status=case.status.value,
                current_strategy=orch.selected_strategy,
                orchestration_decision=orch.decision.value,
                attempt_number=orch.attempt_number,
                next_evaluation_or_action=orch.scheduled_time,
                human_attention_required=orch.human_escalation_required,
                created_at=case.created_at,
                updated_at=case.updated_at,
                priority_score=priority
            ))
            
            # Human Attention
            if orch.human_escalation_required or case.status == RecoveryCaseStatus.ESCALATED:
                age_hours = (current_time - case.created_at).total_seconds() / 3600.0
                attention_items.append(HumanAttentionSummary(
                    case_id=case.id,
                    amount=case.amount_at_risk,
                    reason=orch.reason,
                    current_state=case.status.value,
                    case_age_hours=round(age_hours, 1)
                ))

    # Sort queue by priority
    queue_items.sort(key=lambda x: (x.priority_score, -x.amount))
    queue_summary = RecoveryQueueSummary(
        items=queue_items,
        total_queue_value=sum(item.amount for item in queue_items)
    )
    
    recovery_rate = 0.0
    if total_revenue_at_risk > Decimal("0"):
        recovery_rate = float((total_confirmed_recovered / total_revenue_at_risk) * Decimal("100.0"))

    # Strategy Performance (F14)
    # Ensure this doesn't mutate or fail
    strat_summaries = []
    best_strategy = None
    try:
        f14_res = get_strategy_performance(store)
        best_strategy = f14_res.best_strategy
        for st in f14_res.strategy_statistics:
            if st.total_attempts > 0:
                strat_summaries.append(StrategyPerformanceSummary(
                    strategy_name=st.strategy_type,
                    attempts=st.total_attempts,
                    success_rate=st.success_rate,
                    net_recovery=st.net_recovery,
                    avg_recovery=st.average_recovered
                ))
    except Exception:
        pass
        
    metrics = CommandCenterMetrics(
        total_revenue_at_risk=total_revenue_at_risk,
        total_recoverable_revenue=total_recoverable_revenue,
        total_confirmed_recovered=total_confirmed_recovered,
        total_incremental_revenue=Decimal("0.00"), # Needs F12 context
        recovery_rate=round(recovery_rate, 2),
        total_cases=total_cases,
        active_cases=active_cases,
        recovered_cases=recovered_cases,
        stopped_cases=stopped_cases,
        expired_cases=expired_cases,
        human_attention_cases=len(attention_items),
        total_recovery_actions=total_actions,
        successful_actions=successful_actions,
        failed_actions=failed_actions,
        blocked_actions=blocked_actions,
        scheduled_actions=scheduled_actions,
        best_performing_strategy=best_strategy,
        average_expected_recovery=Decimal("0.00"),
        average_actual_recovery=Decimal("0.00"),
        average_recovery_variance=Decimal("0.00")
    )

    # 3. Revenue Comparison (F12) - strict Read Only
    sim_available = False
    comparison_metrics = []
    
    if getattr(store, "latest_simulation", None) is not None:
        sim = store.latest_simulation
        sim_available = True
        
        # Populate incremental on metrics if available
        metrics.total_incremental_revenue = sim.incremental_recovery_vs_basic_retry
        
        # Build 3 scenarios
        comparison_metrics.append(RevenueComparisonMetrics(
            scenario_type="NO_INTERVENTION",
            is_simulated=True,
            simulated_projected_recovery=sim.no_intervention_recovered_amount,
            actual_recovered_value=Decimal("0.00"),
            intervention_cost=Decimal("0.00"),
            net_recovery=sim.no_intervention_recovered_amount,
            recovery_rate_percentage=0.0,
            projected_incremental_revenue=Decimal("0.00")
        ))
        
        br_rate = 0.0
        if sim.total_revenue_at_risk > 0:
            br_rate = float((sim.basic_retry_recovered_amount / sim.total_revenue_at_risk) * Decimal("100.0"))
            
        comparison_metrics.append(RevenueComparisonMetrics(
            scenario_type="BASIC_RETRY",
            is_simulated=True,
            simulated_projected_recovery=sim.basic_retry_recovered_amount,
            actual_recovered_value=Decimal("0.00"),
            intervention_cost=Decimal("0.00"), # Simulated basic doesn't heavily track cost globally easily
            net_recovery=sim.basic_retry_recovered_amount,
            recovery_rate_percentage=round(br_rate, 2),
            projected_incremental_revenue=Decimal("0.00")
        ))
        
        comparison_metrics.append(RevenueComparisonMetrics(
            scenario_type="SENTINEL_OPTIMIZED",
            is_simulated=True,
            simulated_projected_recovery=sim.sentinel_recovered_amount,
            actual_recovered_value=Decimal("0.00"),
            intervention_cost=sim.total_intervention_cost,
            net_recovery=sim.sentinel_net_recovery,
            recovery_rate_percentage=sim.sentinel_recovery_rate,
            projected_incremental_revenue=sim.incremental_recovery_vs_basic_retry
        ))
        
    # 4. Trends - Simplistic generation based on history of cases created today vs yesterday
    # In a real app we'd aggregate by day, here we just do a couple buckets
    trend_points = []
    if merchant_cases:
        # Simplistic fallback
        trend_points.append(RevenueTrendPoint(
            timestamp=current_time,
            actual_revenue_at_risk=total_revenue_at_risk,
            actual_recovered_revenue=total_confirmed_recovered,
            actual_incremental_revenue=Decimal("0.00")
        ))

    return MerchantCommandCenterResponse(
        generated_at=current_time,
        merchant_id=merchant_id,
        metrics=metrics,
        revenue_comparison=comparison_metrics,
        recovery_queue=queue_summary,
        human_attention_cases=attention_items,
        strategy_performance=strat_summaries,
        revenue_trend=trend_points,
        simulation_available=sim_available
    )

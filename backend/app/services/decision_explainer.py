import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional

from app.models.domain import (
    RecoveryCase,
    RecoveryCaseStatus,
    RevenueEventType,
    RiskLevel,
    DecisionExplanation,
    ExplanationEvidence,
    GuardrailExplanation,
    DecisionTimelineEvent,
    ExpectedVsActualOutcome,
    RecoveryActionType,
    RecoveryActionStatus
)
from app.store import MemoryStore
from app.services.risk_engine import assess_risk
from app.services.strategy_optimizer import optimize_strategy
from app.services.recovery_orchestrator import evaluate_orchestration
from app.services.guardrails import evaluate_guardrails
from app.services.strategy_performance import get_strategy_recommendation
from app.services.ai_diagnosis import generate_diagnosis

def build_decision_explanation(case_id: uuid.UUID, store: MemoryStore, current_time: datetime) -> DecisionExplanation:
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
        
    case = store.recovery_cases.get(case_id)
    if not case:
        raise ValueError(f"Recovery case {case_id} not found")

    event = store.revenue_events.get(case.revenue_event_id)
    if not event:
        raise ValueError(f"Revenue event {case.revenue_event_id} not found")

    # 1. Risk Explanation
    existing_failures = [e for e in store.revenue_events.values() if e.customer_id == event.customer_id and e.id != event.id and e.status == "FAILED"]
    risk_result = assess_risk(event, len(existing_failures), 0)
    
    # 2. Strategy Optimization (F11)
    try:
        strategy_res = optimize_strategy(store, case, current_time)
        selected_strategy = strategy_res.recommended_strategy
        strategy_reason = " | ".join(strategy_res.reasons)
        expected_recovery = strategy_res.expected_recovery_amount
        expected_net_recovery = strategy_res.expected_net_recovery
        alt_strats = [s.model_dump() for s in strategy_res.strategies]
    except Exception as e:
        selected_strategy = "UNKNOWN"
        strategy_reason = f"Could not compute strategy: {str(e)}"
        expected_recovery = Decimal("0.00")
        expected_net_recovery = Decimal("0.00")
        alt_strats = []

    # 3. Orchestration Decision (F13)
    try:
        orch_res = evaluate_orchestration(case_id, store, current_time)
        orch_decision = orch_res.decision.value
        orch_reason = orch_res.reason
        next_action = orch_res.next_action
    except Exception as e:
        orch_decision = "UNKNOWN"
        orch_reason = f"Could not compute orchestration: {str(e)}"
        next_action = None

    # 4. Guardrails (F10) - Single source of safety truth
    guardrail_checks = []
    guardrail_status = "NOT_EVALUATED"
    if next_action:
        existing_actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
        retry_actions = [a for a in existing_actions if a.action_type == RecoveryActionType.RETRY_PAYMENT and a.status != RecoveryActionStatus.BLOCKED]
        attempt_number = len(retry_actions) + 1
        
        # Explicitly call F10 Guardrails
        guardrail_result = evaluate_guardrails(case, next_action, attempt_number, existing_actions, current_time)
        guardrail_status = "ALLOWED" if guardrail_result.is_allowed else "BLOCKED"
        
        guardrail_checks.append(GuardrailExplanation(
            guardrail="F10 Merchant Guardrail Policy",
            status=guardrail_status,
            actual_value=next_action.value,
            configured_limit=None,
            explanation=guardrail_result.reason
        ))
    else:
        # If no next action from F13 (e.g. STOPPED, ALREADY_RECOVERED), F10 is functionally blocking execution
        guardrail_status = "BLOCKED_BY_STATE"
        guardrail_checks.append(GuardrailExplanation(
            guardrail="Terminal State Check",
            status="BLOCKED",
            actual_value=case.status.value,
            configured_limit="ACTIVE",
            explanation=f"No executable action generated because case state is {case.status.value}."
        ))

    # 5. Historical Evidence (F14)
    hist_ev = None
    try:
        hist_rec = get_strategy_recommendation(store, case_id)
        if hist_rec.sample_size < 5:
            hist_ev = {
                "status": "INSUFFICIENT_DATA",
                "explanation": "Insufficient historical evidence. F14 did not influence the recommendation. F11 baseline remains authoritative.",
                "f11_baseline": hist_rec.f11_baseline_strategy,
                "historical_best": hist_rec.historical_best_strategy
            }
        else:
            hist_ev = {
                "status": "SUFFICIENT_DATA",
                "explanation": hist_rec.explanation,
                "f11_baseline": hist_rec.f11_baseline_strategy,
                "historical_best": hist_rec.historical_best_strategy,
                "combined_advisory": hist_rec.combined_advisory_strategy,
                "sample_size": hist_rec.sample_size,
                "confidence": hist_rec.confidence
            }
    except Exception as e:
        hist_ev = {
            "status": "ERROR",
            "explanation": f"Failed to retrieve historical evidence: {str(e)}"
        }

    # 6. Expected vs Actual Outcome
    # Compute actual recovery from outcomes
    lifecycle = None
    if hasattr(store, "recovery_lifecycles"):
        lifecycle = store.recovery_lifecycles.get(case.id)
    
    actual_recovery = lifecycle.actual_recovered_amount if lifecycle else Decimal("0.00")
    outcome_status = "Pending"
    if case.status in (RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.STOPPED, RecoveryCaseStatus.ESCALATED):
        outcome_status = "Resolved"

    variance = actual_recovery - expected_recovery

    expected_vs_actual = ExpectedVsActualOutcome(
        expected_recovery=expected_recovery,
        actual_recovery=actual_recovery,
        variance=variance,
        outcome_status=outcome_status
    )

    # 7. Timeline Construction
    timeline = []
    timeline.append(DecisionTimelineEvent(
        timestamp=event.created_at,
        event_type="PAYMENT_FAILED" if event.event_type == RevenueEventType.PAYMENT_FAILED else event.event_type.value,
        title="Payment Event Ingested",
        description=f"Received {event.event_type.value} event for amount {event.amount}.",
        status="COMPLETED",
        source_id=str(event.id)
    ))
    timeline.append(DecisionTimelineEvent(
        timestamp=case.created_at,
        event_type="CASE_CREATED",
        title="Recovery Case Created",
        description=f"Assessed risk as {risk_result.risk_level.value}.",
        status="COMPLETED",
        source_id=str(case.id)
    ))

    # Add Action attempts
    actions = [a for a in store.recovery_actions.values() if a.recovery_case_id == case.id]
    actions.sort(key=lambda x: x.created_at)
    for a in actions:
        timeline.append(DecisionTimelineEvent(
            timestamp=a.created_at,
            event_type=f"ACTION_{a.action_type.value}",
            title=f"Action: {a.action_type.value}",
            description=f"Status: {a.status.value}",
            status=a.status.value,
            source_id=str(a.id)
        ))

    # Add Audit logs for simulation/orchestration if present
    audits = [l for l in store.audit_logs if l.recovery_case_id == case.id]
    audits.sort(key=lambda x: x.created_at)
    for l in audits:
        if l.action.startswith("ORCHESTRATION_"):
            timeline.append(DecisionTimelineEvent(
                timestamp=l.created_at,
                event_type=l.action,
                title="Orchestration Evaluated",
                description=l.action,
                status="COMPLETED",
                source_id=str(l.id)
            ))

    if lifecycle and lifecycle.recovered_at:
        timeline.append(DecisionTimelineEvent(
            timestamp=lifecycle.recovered_at,
            event_type="PAYMENT_RECOVERED",
            title="Payment Recovered",
            description=f"Recovered {lifecycle.actual_recovered_amount}.",
            status="COMPLETED"
        ))

    timeline.sort(key=lambda x: x.timestamp)

    # 8. References
    refs = [
        ExplanationEvidence(
            source_type="revenue_event",
            source_id=str(event.id),
            label="Event Type",
            value=event.event_type.value,
            explanation="The initial payment event that triggered this case."
        ),
        ExplanationEvidence(
            source_type="risk_engine",
            label="Risk Level",
            value=risk_result.risk_level.value,
            explanation="Deterministic risk assessment."
        ),
        ExplanationEvidence(
            source_type="strategy_optimizer",
            label="Baseline Strategy",
            value=selected_strategy,
            explanation="F11 Strategy Optimization Result."
        )
    ]

    # 9. AI Diagnosis (F19)
    diagnosis_obj = None
    analysis_source = None
    try:
        diag = generate_diagnosis(case_id)
        if diag:
            diagnosis_obj = diag.model_dump()
            analysis_source = diag.analysis_source
    except Exception as e:
        print(f"Failed to generate diagnosis: {e}")

    return DecisionExplanation(
        case_id=case_id,
        generated_at=current_time,
        case_status=case.status,
        payment_event_type=event.event_type,
        payment_amount=event.amount,
        risk_level=risk_result.risk_level,
        risk_reasons=[risk_result.reason],
        strategy_selected=selected_strategy,
        strategy_reason=strategy_reason,
        alternative_strategies=alt_strats,
        orchestration_decision=orch_decision,
        orchestration_reason=orch_reason,
        guardrail_status=guardrail_status,
        guardrail_checks=guardrail_checks,
        historical_evidence=hist_ev,
        expected_vs_actual=expected_vs_actual,
        timeline=timeline,
        evidence_references=refs,
        diagnosis=diagnosis_obj,
        analysis_source=analysis_source
    )

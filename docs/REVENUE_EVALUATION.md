# VORTEX Revenue Evaluation

VORTEX is designed to evaluate recovery effectiveness using measurable, verified outcomes. The core evaluation principle of the system is absolute:

**Attempted recovery ≠ verified recovery.**

VORTEX does not treat an AI recommendation, a Razorpay order creation, or a checkout initiation as recovered revenue. Revenue is officially counted only when the external payment verification flow confirms the outcome.

## 1. Evaluation Principle

VORTEX evaluates the complete recovery lifecycle:

**Detect → Diagnose → Decide → Guard → Recover → Verify → Measure → Learn**

The "Measure" and "Learn" phases strictly depend on the "Verify" phase. If a payment is not verified (e.g., via a `payment.captured` webhook or an API poll), it is treated as a failed attempt, and the revenue remains at risk.

## 2. Core Revenue Metrics

VORTEX continuously calculates operational metrics (via `CommandCenterMetrics` and `StrategyPerformanceResponse`):

- **Total Revenue at Risk**: The aggregate `amount_at_risk` from all analyzed `OPEN` and `IN_PROGRESS` cases.
- **Total Revenue Recovered**: The aggregate amount from cases that successfully transitioned to the `RECOVERED` state.
- **Recovery Rate**: Calculated mathematically as `(total_recovered / total_risk) * 100`.
- **Recovery Attempts**: The total count of all actions processed.
- **Successful Attempts**: The count of actions that directly resulted in a `RECOVERED` case.

## 3. Verified Recovery

The distinction between action and outcome is strictly maintained:
- **Action Attempted**: A Razorpay order is created (`PROPOSED` → `ALLOWED` → `EXECUTED`).
- **Verified Recovery**: The server verifies the `x-razorpay-signature` and payment state (or webhook). The `RecoveryCaseStatus` transitions to `RECOVERED`.

Merely launching Checkout or creating an order is not sufficient evidence of recovery.

## 4. Recovery Effectiveness

VORTEX tracks recovery effectiveness by examining the action-to-outcome mapping. 
To consider a specific recovery action genuinely successful:
1. The case must be `RECOVERED`.
2. The action must be the *final executed action* (the causal action).

Actions that are executed but followed by further failures on the same case are recorded as `failed_attempts`.

## 5. Strategy Performance

VORTEX evaluates the effectiveness of specific recovery strategies (e.g., `IMMEDIATE_RETRY`, `ESCALATE_TO_HUMAN`) using a weighted scoring model:

- **Net Recovery**: `Total Recovered Revenue - Total Intervention Cost`. (e.g., `IMMEDIATE_RETRY` costs ₹5.00, `ESCALATE_TO_HUMAN` costs ₹100.00).
- **Success Rate**: `(Successful Attempts / Total Attempts) * 100`.
- **Score Calculation**: The performance score is weighted as **60% Net Recovery** and **40% Success Rate**.

*Note: VORTEX requires a minimum threshold of historical attempts (e.g., `total_attempts >= 3` or `5`) before declaring a strategy as statistically valid. If insufficient data exists, it falls back to deterministic baselines.*

## 6. Event-Type Segmentation

Strategy performance is actively segmented by the originating `RevenueEventType` (e.g., `PAYMENT_FAILED` vs. `INVOICE_OVERDUE`). 

This segmentation is critical: a strategy that yields a high success rate for a standard payment failure (e.g., Immediate Retry) may perform poorly for an overdue invoice, where a `SEND_PAYMENT_LINK` or `ESCALATE_TO_HUMAN` might yield higher net recovery.

## 7. Strategy Learning

Historical verified outcomes feed back into future Decision Intelligence. VORTEX does **not** autonomously retrain a neural network. Instead, it statistically aggregates the outcomes of past actions (successes, failures, net revenue). 

When a new case arrives, the system queries this historical performance data. If a specific strategy has historically yielded the highest net recovery for similar events, VORTEX will recommend it over the default AI baseline.

## 8. Incremental Revenue & Simulation

VORTEX includes a **Recovery Simulation** and **What-If Lab** to estimate future recovery potential.

- **Baseline/No Intervention**: The expected organic recovery if the system did nothing.
- **Basic Retry**: The expected recovery using blind retry loops.
- **Sentinel Optimized**: The projected recovery using VORTEX's intelligence.
- **Incremental Revenue**: `Sentinel Optimized - Basic Retry`.

**CRITICAL LIMITATION**: The system strictly distinguishes between actual and simulated metrics (`is_simulated = True`). Simulated or projected revenue is explicitly labeled as a projection and is never aggregated into actual verified recovered revenue.

## 9. Safety-Aware Evaluation

Maximizing recovery is not the only objective; recovery must remain within deterministic policy boundaries. VORTEX evaluates safety alongside revenue:

- **Blocked Actions**: The system tracks actions rejected by guardrails (e.g., exceeding the maximum 3-retry limit).
- **Intervention Cost**: Highly aggressive retry strategies accumulate cost. The Strategy Optimizer penalizes strategies that generate high costs with low success rates.

## 10. Evaluation Example

*(Illustrative calculation based on VORTEX engine logic)*:
- **Total Revenue at Risk**: ₹100,000 (10 cases)
- **Recovery Attempts**: 15
- **Guardrail Blocks**: 3 (Prevented unsafe execution)
- **Successful Verified Recoveries**: 4 cases
- **Total Recovered Revenue**: ₹40,000
- **Recovery Rate**: 40.00%
- **Best Strategy**: `IMMEDIATE_RETRY` (Highest weighted score of Net Recovery and Success Rate).

## 11. Evidence Model

To claim a successful recovery in a Buildathon evaluation, the following evidence chain must exist in the VORTEX audit log:

1. `CASE_CREATED` (Revenue at risk identified).
2. `ACTION_PROPOSED` and `ACTION_ALLOWED` (Guardrail passed).
3. `RAZORPAY_ORDER_CREATED` (Execution initiated).
4. `WEBHOOK_RECEIVED` (Payment evidence received).
5. `CASE_RECOVERED` (State finalized and revenue recorded).

## 12. Buildathon Evaluation Alignment

VORTEX specifically targets the Razorpay Track 03 requirements by demonstrating:
- **Detection**: Deterministic ingestion of failed revenue events.
- **Intervention**: Strategy selection based on segmented historical performance.
- **Bounded Recovery**: Guardrail enforcement and Razorpay Test Mode execution.
- **Measured Recovery**: Revenue is only counted upon cryptographically verified Razorpay webhooks.

## 13. Limitations

- Razorpay integration is demonstrated in Test Mode.
- Application state is volatile/in-memory for the demo.
- Simulation and projected outcomes are mathematical estimates, not real recovered revenue.
- Historical strategy metrics depend heavily on the available recorded outcomes; early-stage systems will rely heavily on fallback behavior.

## 14. Related Documentation

- [Recovery Engine](RECOVERY_ENGINE.md)
- [Guardrails & Safety Boundaries](GUARDRAILS.md)
- [Razorpay Integration](RAZORPAY_INTEGRATION.md)
- [Webhook Verification](WEBHOOK_VERIFICATION.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Demo Runbook](DEMO_RUNBOOK.md)

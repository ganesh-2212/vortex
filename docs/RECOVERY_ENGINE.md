# Recovery Engine

The VORTEX Recovery Engine governs the entire lifecycle of a failed payment, transforming it from a "loss" into a measurable, verifiable recovery attempt.

## The Lifecycle

1. **Detect**: A failure event (webhook, API call, or synthetic demo injection) creates a `RecoveryCase`.
2. **Diagnose**: The AI parses the failure reason to recommend a strategy.
3. **Decide**: The `strategy_optimizer.py` evaluates the AI's recommendation alongside historical strategy performance to pick the historically best intervention.
4. **Guard**: Deterministic rules (`guardrails.py`) verify if the selected intervention is legally/operationally allowed.
5. **Recover**: The intervention is executed (e.g., Razorpay checkout modal presented to the user).
6. **Verify**: VORTEX waits for authoritative proof of recovery (a Razorpay `payment.captured` webhook).
7. **Measure**: The `amount_at_risk` is moved to `recovered_amount`, and performance statistics are updated.
8. **Learn**: The outcome modifies future strategy recommendations.

## State Management
A `RecoveryCase` progresses through explicit states:
- `OPEN`: Failure detected, awaiting action.
- `RECOVERING`: An action (e.g., payment link sent, checkout opened) is in progress.
- `RECOVERED`: Authoritative verification received; revenue secured.
- `ESCALATED`: Risk is too high or guardrails are exhausted; requires human review.
- `STOPPED`: Recovery halted permanently by policy.

A case can only be marked `RECOVERED` if accompanied by valid external payment verification. Actions alone do not constitute recovery.

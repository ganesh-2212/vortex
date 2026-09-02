# F15: Decision Explainability & Revenue Case Intelligence

The Decision Explainability layer (F15) provides full deterministic transparency into how Revenue Sentinel manages failed payments and orchestrates recovery strategies.

## Architectural Goal
To answer the core operational question: **"Why did the system do this?"**

F15 strictly adheres to the following constraints:
1. **No Artificial Intelligence**: Explanations are derived dynamically from existing audit logs, telemetry, and executed decisions. F15 does not use LLMs or generative algorithms to "guess" reasoning.
2. **Read-Only / Advisory Role**: F15 is an observability layer. It never alters system state, bypasses guardrails, or schedules actions.

## Decision Hierarchy
F15 builds its explanation by reconstructing the deterministic pipeline in the following exact order:

1. **Risk Engine**: Why was this event scored as LOW / MEDIUM / HIGH / CRITICAL?
2. **Strategy Optimization (F11)**: Why was a specific recovery strategy (e.g., `RETRY_PAYMENT`, `ESCALATE_TO_HUMAN`) recommended based on expected net value?
3. **Orchestration (F13)**: Why was the decision `EXECUTE_NOW`, `WAIT_COOLDOWN`, or `STOP` made based on the current context?
4. **Safety & Guardrails (F10)**: Did the merchant configuration explicitly allow or block the recommended action? F10 is the ultimate authority.
5. **Historical Intelligence (F14)**: Did past telemetry data overrule or support the F11 baseline recommendation?
6. **Financial Simulation Outcomes (F12)**: How much revenue was expected vs. actually recovered?

## The F10 Guardrails Authority Rule
F15 enforces a rigid architectural rule regarding safety:
**F10 is the single source of truth for all safety decisions.**

`decision_explainer.py` evaluates the selected strategy by invoking `evaluate_guardrails` and using the precise output to formulate the explanation. F15 is strictly forbidden from bypassing, reproducing, or overriding F10 rules.

## Data Lineage
- **Action Audit Trail**: Realized through the system `MemoryStore`'s `audit_logs` array.
- **Timeline construction**: Aggregates timestamps from `RevenueEvent`, `RecoveryCase`, `RecoveryAction`, and `RecoveryLifecycle`.

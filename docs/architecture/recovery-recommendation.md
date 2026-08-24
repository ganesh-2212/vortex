# Recovery Recommendation Engine Architecture

This document describes the design, rules, formulas, and safety guardrails governing the automated recovery recommendation engine in Revenue Sentinel.

> [!IMPORTANT]
> Recommendations are deterministic decision support and do not execute recovery actions automatically.

---

## 1. Core Principles & Safety
- **No Automated Execution:** Recommendations represent advisory guidelines for merchants. Proposing or executing an action is a separate flow that is manually triggered by operators and validated by the guardrail system.
- **Safety Precedence:** Guardrails are always evaluated first. If `RETRY_PAYMENT` is blocked by cooldowns or attempts limits, the engine will never recommend it, falling back instead to `ESCALATE_TO_HUMAN` or `STOP_RECOVERY`.

---

## 2. Recommendation Decision Tree
Active cases are evaluated against three advisory actions:
1. **RETRY_PAYMENT**: Recommended for active `OPEN`/`IN_PROGRESS` cases with `HIGH` or `MEDIUM` risk where the retry guardrails (cooldown, limit) allow it and the heuristic estimated recoverable value is positive.
2. **ESCALATE_TO_HUMAN**: Recommended if:
   - Case risk is `CRITICAL`.
   - The retry guardrail is `BLOCKED`.
   - Repeated failures (2 prior attempts) indicate low recovery opportunity.
   - The case age is `AGING` or `STALE` and still unresolved.
3. **STOP_RECOVERY**: Recommended if the recovery opportunity is fully exhausted (3 attempts reached) or if the estimated recoverable amount is ₹0.

---

## 3. Confidence Formula
The confidence score is a deterministic rating bounded between `0` and `100`:

Confidence = Base + Risk_adj + Time_adj + History_adj + Guardrail_adj

### Base Score
- **Strong Match** (Fresh High-Risk retry): `90`
- **Normal Match** (Escalation / normal retry): `75`
- **Weak Match** (Stop Recovery): `60`

### Adjustment Offsets
- **Risk Level**:
  - `CRITICAL` risk: +5 for Escalation, -10 for Retry.
  - `HIGH` risk: +10 for Retry.
  - `LOW` risk: -10 for Retry.
- **Time Sensitivity**:
  - `FRESH` (< 24 hrs): +5 for Retry.
  - `STALE` (> 72 hrs): -10 for Retry, +5 for Escalation/Stop.
- **Failure History**:
  - 0 attempts: +5 for Retry.
  - \>0 failed attempts: -10 for Retry, +10 for Escalation/Stop.
- **Guardrail status**:
  - If blocked: +10 for Escalation/Stop alternative.

---

## 4. Heuristic Value vs Confirmed Recovered
To maintain accounting and telemetry integrity, Revenue Sentinel isolates:
- **Heuristic Estimated Recoverable**: An indicator predicting the potential value that *might* be recovered using base risk coefficients, retry counts, age factors, and failure counts.
- **Actual Recovered Revenue**: The confirmed sum of transaction amounts that have successfully completed mock provider execution. Failed attempts always contribute ₹0.

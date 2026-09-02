# Strategy Performance & Intelligence (F14)

## Purpose
The F14 Strategy Performance module closes the feedback loop on Revenue Sentinel's recovery actions. While F11 predicts which strategy *should* work best (based on heuristics and real-time risk data) and F13 schedules that execution, F14 analyzes the **actual outcomes** of past recovery actions to determine what *historically* works best.

F14 is entirely deterministic. It does not use machine learning or LLMs.

## Data Sources
F14 relies on the central `MemoryStore`, specifically:
- `recovery_cases` for determining outcome states (`RECOVERED`, `FAILED`, etc.) and amount recovered.
- `recovery_actions` for tracking the attempts made (`EXECUTED`, `FAILED`), their timestamps, and execution costs.
- `revenue_events` for mapping recoveries back to specific failure types (e.g., `PAYMENT_FAILED`, `ISSUER_DEGRADATION`).

## Metrics Calculated
For each strategy, F14 calculates:
- **Success Rate**: `successful_attempts / total_eligible_attempts`
- **Total Recovered**: Sum of actual amounts recovered by successful attempts of a strategy.
- **Average Recovery**: `total_recovered / successful_attempts`
- **Net Recovery**: `total_recovered - total_execution_cost` (Execution costs: Immediate/Delayed Retry = $5, Alternate = $15, Escalate = $100)
- **Recovery Variance**: `actual_recovery - expected_recovery`
- **Average Attempts**: Average number of action executions needed before a recovery succeeded.

## Deterministic Performance Score
The performance score is calculated for strategies that meet the **Minimum Sample Size** requirement (N >= 5). This protects against skewed recommendations caused by tiny sample sizes (e.g. 1 success out of 1 attempt).

The scoring formula ranks strategies based primarily on **Net Recovery**:
```
Score = (Success Rate * 0.4) + ((Strategy Net Recovery / Highest Net Recovery) * 100 * 0.6)
```
*Note: If no strategy meets the sample size requirement, the system automatically falls back to F11 baseline predictions.*

## F11 + F14 Integration & Guardrail Precedence
F14 integrates with the F11 optimizer to provide a **Combined Advisory Signal**.

1. **F11 Evaluation**: The system first evaluates the case using the F11 deterministic model. F11 checks all active Merchant Guardrails.
2. **Historical Lookup**: F14 looks up the historically best performing strategy based on actual net recovery.
3. **Guardrail Enforcement**: If the historically best strategy is BLOCKED by current F10 Guardrails (e.g. retries disabled), it is discarded. F14 **never** overrides hard policy constraints.
4. **Final Recommendation**: If the historical best strategy is allowed by guardrails and meets the sample size threshold, it becomes the Combined Advisory Strategy. Otherwise, the system falls back to the F11 Baseline Strategy.

## Limitations
- Calculations assume immediate full-amount recovery upon an `EXECUTED` retry action for simplicity.
- The system groups historical performance globally, rather than scoping it exclusively to individual merchants.
- Performance variance logic uses a simplified deterministic baseline of `70% of amount_at_risk` to represent "expected" value for variance calculation purposes.

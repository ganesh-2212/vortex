# Revenue Intelligence & Risk Analysis Architecture

This document describes the design, formulas, and explainability features of the Revenue Sentinel intelligence layer.

---

## Core Principles

> [!IMPORTANT]
> **Heuristic and Deterministic Calculations**
>
> All calculations, including priority scores and recoverability estimations, use deterministic, rule-based algorithms. We explicitly avoid AI models or statistical models for these metrics to ensure that:
> - Results are transparent, explainable, and audit-verifiable.
> - Calculations are completely reproducible and free of hallucination or bias.
> - Systems enforce consistent policies before any future automated intervention.

---

## Time Sensitivity

Time sensitivity measures the age of a recovery case relative to the originating revenue event:
- **Calculation**:
  `hours_since_event = (current_time - event_occurred_at).total_seconds() / 3600.0`
- **Categories**:
  - **FRESH**: `< 24 hours` (highest urgency)
  - **AGING**: `24 to 72 hours`
  - **STALE**: `> 72 hours` (lowest urgency)

---

## Priority Scoring

The priority score represents the relative urgency of acting on a case. The score is bounded between **0 and 100** and is calculated as a weighted sum of five deterministic factors:

$$\text{Priority Score} = (\text{Risk Severity} \times 0.35) + (\text{Amount Score} \times 0.30) + (\text{Time Sensitivity} \times 0.15) + (\text{Failure Count} \times 0.10) + (\text{Recovery Opportunity} \times 0.10)$$

### Weights and Metrics

1. **Risk Severity (35% weight)**:
   - `CRITICAL` -> 100 points
   - `HIGH` -> 75 points
   - `MEDIUM` -> 50 points
   - `LOW` -> 25 points
2. **Amount Score (30% weight)**:
   - Linear normalization capped at 100:
     `amount_score = min(100.0, (amount / 50000.0) * 100.0)`
3. **Time Sensitivity (15% weight)**:
   - `FRESH` -> 100 points
   - `AGING` -> 60 points
   - `STALE` -> 20 points
4. **Failure Count (10% weight)**:
   - Linear scaling:
     `failure_score = min(100.0, failure_count * 25.0)`
5. **Recovery Opportunity (10% weight)**:
   - Evaluates if recovery attempts remain:
     `opportunity_score = 100.0` if `retry_count < 3` else `0.0`

---

## Heuristic Recoverability

Estimated recoverable revenue is calculated to help merchants prioritize their recovery efforts.

> [!CAUTION]
> **Heuristic Distinction**
>
> "Estimated recoverable revenue is a heuristic estimate, not money actually recovered."
>
> We do NOT describe or refer to this metric as an AI prediction, learned probability, or historical probability, as the platform does not yet contain sufficient historical outcome data.

### Heuristic Rate Formula

The estimated recoverable value is computed by multiplying the amount at risk by a heuristic recovery rate:

$$\text{Heuristic Rate} = \text{Base Rate} \times \text{Retry Factor} \times \text{Age Factor} \times \text{Failure Factor}$$

1. **Base Rate (Risk Level)**:
   - `LOW` -> 0.80
   - `MEDIUM` -> 0.60
   - `HIGH` -> 0.40
   - `CRITICAL` -> 0.20
2. **Retry Factor**:
   - 0 retries -> 1.0
   - 1 retry -> 0.8
   - 2 retries -> 0.5
   - >=3 retries -> 0.0 (opportunity exhausted)
3. **Age Factor**:
   - `FRESH` -> 1.0
   - `AGING` -> 0.8
   - `STALE` -> 0.5
4. **Failure Factor**:
   - 0 failures -> 1.0
   - 1 failure -> 0.9
   - >=2 failures -> 0.7

---

## Explainability

Every case analyzed by the intelligence layer generates a list of `IntelligenceReason` items. This ensures that:
- Merchants understand exactly why a case is flagged as high risk.
- Merchants can trace the specific signals contributing to the priority score.
- Financial audit teams can verify the logic behind recovery prioritization.

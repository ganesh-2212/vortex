# Strategy Learning Loop

VORTEX is not a static rules engine; it incorporates a feedback loop where authoritative recovery outcomes shape future recovery decisions.

## Tracking Performance
The `strategy_performance.py` module aggregates historical data for all attempted interventions. For each unique strategy, it tracks:
- **Total Attempts**: How many times the strategy was used.
- **Successful Recoveries**: How many times the strategy resulted in a verified payment capture.
- **Costs incurred**: Fixed or percentage-based operational costs associated with the strategy.

## Event-Specific Segmentation
Because different failure types (e.g., `card_insufficient_funds` vs `bank_timeout`) respond differently to interventions, strategy performance is isolated by the specific failure event type. The system evaluates a strategy's success rate strictly within the context of the current event type, ensuring highly relevant decision-making.

## The Learning Loop
When the AI Diagnosis layer (`ai_diagnosis.py`) outputs a recommended strategy, the Strategy Optimizer (`strategy_optimizer.py`) intercepts it. 

1.  **Baseline Evaluation**: The Optimizer queries the historical statistics for the recommended strategy (segmented by the current event type).
2.  **Fallback Threshold**: If the recommended strategy lacks sufficient historical attempts (e.g., fewer than 5), the system safely falls back to standard baseline calculations.
3.  **Dynamic Boosting**: If the strategy has proven historical success above a minimum threshold, its confidence and expected recovery calculations are mathematically boosted based on genuine empirical evidence.

As more Razorpay webhooks confirm recoveries, the historical success rate climbs, further solidifying the historical dominance of the best-performing strategies.

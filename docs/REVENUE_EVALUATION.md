# Revenue & Performance Evaluation

VORTEX is designed to prove its value through measurable, verifiable metrics. The system tracks both actual historical performance and projected/simulated capabilities.

## Actual Metrics
The **Merchant Command Center** tracks genuine operational telemetry:
-   **Recoverable Revenue at Risk**: The total value of all cases in `OPEN` or `RECOVERING` states.
-   **Total Recovered Revenue**: The mathematically summed value of all cases explicitly verified as `RECOVERED` via payment capture.
-   **Recovery Rate**: The percentage of cases successfully recovered vs total cases processed.

## Strategy Metrics
The **Strategy Performance** module evaluates interventions over time:
-   **Attempts & Success**: Tracks how many times a specific strategy (e.g., `DELAYED_RETRY`) was attempted vs how many times it actually resulted in a recovery.
-   **Cost Analysis**: Accounts for the operational or financial cost of an intervention (e.g., discounting or SMS fees) to calculate **Net Recovered Revenue**.
-   **Event Segmentation**: Tracks strategy effectiveness separately based on the specific failure event type (e.g., `card_insufficient_funds` vs `bank_timeout`), recognizing that different failures require different optimal strategies.

## Recovery Simulation (Batch Evaluation)
The **Recovery Simulation** module provides deterministic batch evaluation.
-   It evaluates a large queue of open cases against current policies and historical strategy statistics.
-   It calculates the **Projected Net Recovery**, demonstrating how the VORTEX intelligence engine mathematically improves upon a baseline (e.g., standard generic retries).
-   Crucially, this is purely simulated and does not mutate real case states.

## Policy What-If Lab
The **Policy What-If Lab** allows operators to safely adjust policies (e.g., increasing `MAX_ATTEMPTS`) within an isolated, deeply-cloned sandbox environment. Evaluators can observe how relaxing or tightening guardrails affects projected revenue and block rates without risking production data.

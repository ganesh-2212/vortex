# Recovery Strategy Optimization Architecture

This document describes the design, ranking logic, expected recovery equations, and guardrail constraints of the F11 Recovery Strategy Optimization system.

---

## 1. Strategy Types

The strategy optimizer evaluates five distinct recovery approaches for each active case:

*   `IMMEDIATE_RETRY`: Triggers an immediate card-present retry. Blocked if the case is in cooldown or max retries are exceeded.
*   `DELAYED_RETRY`: Defers a card retry until the active cooldown period has expired, allowing time for the customer to fund the account.
*   `ALTERNATE_PAYMENT`: Offers alternative payment methods (e.g. UPI, NetBanking, payment links). It is recommendation-only (non-executable).
*   `ESCALATE_TO_HUMAN`: Escalates the case to customer support agents for manual resolution.
*   `NO_INTERVENTION`: Halts active recovery processes.

---

## 2. Deterministic Probability Logic

We calculate recovery probability $P$ (clamped between 0% and 100%) based on historical case telemetry:

1.  **IMMEDIATE_RETRY**:
    *   *Base probability*: $70\%$
    *   *Risk adjustments*: Critical risk penalizes probability ($-30\%$) to protect cardholder safety. High risk adds $+10\%$. Low risk subtracts $-20\%$.
    *   *Failure history*: Subtracts $-15\%$ for each prior failed attempt.
    *   *Age adjustment*: Aging or stale case subtracts $-20\%$.
2.  **DELAYED_RETRY**:
    *   *Base probability*: $60\%$
    *   *Risk adjustments*: Critical risk subtracts $-20\%$. High risk adds $+10\%$. Low risk subtracts $-15\%$.
    *   *Failure history*: Subtracts $-10\%$ for each prior failed attempt.
    *   *Wait adjustment*: If in active cooldown, waiting out the period adds $+15\%$ success probability.
3.  **ALTERNATE_PAYMENT**:
    *   *Base probability*: $50\%$
    *   *Risk adjustments*: High risk adds $+10\%$.
    *   *Failure history*: If prior failed attempts $\ge 2$, alternate channels become more attractive ($+15\%$).
4.  **ESCALATE_TO_HUMAN**:
    *   *Base probability*: $65\%$ if risk is critical or prior retries $\ge 2$. Otherwise $40\%$.
    *   *Risk adjustments*: Low risk subtracts $-10\%$.
5.  **NO_INTERVENTION**:
    *   Always $0\%$.

---

## 3. Expected Value Logic

Expected recovery is evaluated using two financial formulas:

$$\text{Expected Recovery Amount} = \text{Amount at Risk} \times \left(\frac{\text{Recovery Probability}}{100}\right)$$

$$\text{Expected Net Recovery} = \text{Expected Recovery Amount} - \text{Intervention Cost}$$

### Baseline Intervention Costs
*   `NO_INTERVENTION`: ₹0.00
*   `IMMEDIATE_RETRY`: ₹5.00
*   `DELAYED_RETRY`: ₹5.00
*   `ALTERNATE_PAYMENT`: ₹15.00
*   `ESCALATE_TO_HUMAN`: ₹100.00

---

## 4. Selection & Ranking Algorithm

1.  **Guardrail Filter**: Excludes all candidate strategies that fail F10 merchant configurations or strict guardrail restrictions (status `BLOCKED`).
2.  **Sorting Order**: Candidate strategies with status `ALLOWED` are ranked primarily by:
    *   Highest Expected Net Recovery
    *   Highest Confidence Score
    *   Lowest Intervention Cost (safer fallback)
3.  **Advisory Notice**: The optimizer recommends the top ranked strategy, clearly stating that recommendations are advisory and do not auto-trigger payment events.

---

## 5. Estimation vs Confirmed Recovery

*   **Expected Recovery Amount**: A mathematical estimate based on probability curves and risk telemetry.
*   **Confirmed Recovered Amount**: Confirmed, audited settlement value captured on the payment gateway, strictly incremented only upon verified payment success events.

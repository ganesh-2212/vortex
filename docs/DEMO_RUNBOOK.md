# VORTEX Demo Runbook

This guide helps evaluators reproduce the VORTEX revenue recovery workflow, from revenue-risk detection through bounded recovery, payment verification, revenue measurement, and strategy intelligence.

> The demonstration uses Razorpay Test Mode and does not perform real-money transactions.

---

## Prerequisites

To complete this runbook, you will need:

- **VORTEX frontend**: Running locally or via the deployed demo URL.
- **VORTEX backend**: Running locally or via the deployed demo URL.
- **Razorpay Test Mode**: The system is pre-configured to use a Razorpay Test Mode integration.
- **Gemini Availability**: The backend must have a valid `GEMINI_API_KEY` configured in `.env` to demonstrate AI diagnosis (if unavailable, the system gracefully falls back to deterministic logic).

*(For complete local deployment instructions, refer to [DEPLOYMENT.md](DEPLOYMENT.md)).*

---

## Evaluation Overview

The runbook follows this structured lifecycle:

```text
Command Center
      ↓
Recovery Case
      ↓
AI Diagnosis
      ↓
Decision Intelligence
      ↓
Deterministic Guardrails
      ↓
Razorpay Test Mode Checkout
      ↓
Payment Verification
      ↓
RECOVERED Case
      ↓
Audit Timeline
      ↓
Strategy Performance
      ↓
Recovery Simulation
      ↓
Policy What-If Lab
```

---

## Step 1: Command Center & Case Discovery

**Goal**: Discover active cases where revenue is at risk.

1. Navigate to the **Command Center** via the sidebar.
2. Inspect the high-level operational telemetry metrics (e.g., Active Cases, Revenue at Risk, Total Recovered).
3. Observe the "Recent Alerts" and the list of active Recovery Cases requiring attention.
4. Click on an **"ACTIVE"** case in the list to transition to the Case Details view.

*This demonstrates VORTEX's ability to ingest failed revenue events and deterministically assess risk.*

---

## Step 2: AI Diagnosis & Decision Intelligence

**Goal**: Inspect how VORTEX interprets failure context without directly acting on it.

1. On the **Case Detail** page, locate the **AI Root-Cause Diagnosis** panel.
2. Review the structured output:
   - Root Cause Category & Explanation
   - Extracted Evidence
   - Recommended Action
   - Confidence Score
3. Verify the **Analysis Source** (e.g., "gemini" or "Deterministic analysis"). 
4. Move to the **Strategy Optimizer / Decision Intelligence** section.
5. Observe how historical strategy performance data recommends an optimal path forward, separate from the AI's contextual diagnosis.

*This demonstrates the principle: AI provides advisory intelligence, not financial execution.*

---

## Step 3: Deterministic Guardrails

**Goal**: Verify that execution is bounded by safety policies.

1. Below the diagnosis, inspect the **Guardrails Status**.
2. Observe whether the recommended action is listed as **"ALLOWED"**, **"ESCALATED"**, or **"BLOCKED BY GUARDRAIL"**.
3. Notice that if an action violates a cooldown period or maximum retry limit, the system visually indicates that execution is prohibited.

*This demonstrates that deterministic policy is the ultimate execution authority.*

---

## Step 4: Bounded Recovery & Payment Verification

**Goal**: Execute a recovery action and verify the payment through Razorpay Test Mode.

1. Locate the authorized recovery action (e.g., "Execute Immediate Retry").
2. Click the action button. This opens the **Razorpay Checkout** modal.
3. Select any of the provided Razorpay Test Mode success methods (e.g., Netbanking -> Success).
4. Complete the checkout. 
5. Wait briefly as VORTEX processes the `payment.captured` webhook or performs a backend verification polling check.

*This demonstrates external execution bounded by policy, using real Test Mode integrations.*

---

## Step 5: Confirmed Recovery & Audit Timeline

**Goal**: Verify the final outcome and system traceability.

1. After successful checkout, observe that the case status automatically transitions from **ACTIVE** to **RECOVERED**.
2. Scroll to the **Case Audit Timeline** at the bottom of the page.
3. Trace the chronological history of the case:
   - Event Detected
   - AI Diagnosis Generated
   - Execution Authorized
   - Razorpay Order Created
   - Payment Webhook Received
   - Case Recovered
4. Attempt to execute another recovery action on the page and verify that actions are now blocked because the case is closed.

*This demonstrates that confirmed recovery relies on verifiable payment events and that case-state protection works.*

---

## Step 6: Strategy Performance

**Goal**: View how VORTEX learns from verified outcomes.

1. Navigate to **Strategy Performance** via the sidebar.
2. Inspect the breakdown of recovery outcomes categorized by event type and failure reason.
3. Note how the success from Step 5 is factored into the historical conversion rate for that specific strategy.

*This demonstrates that VORTEX relies on real, measured outcome data to inform future decisions, rather than relying on autonomous AI model retraining.*

---

## Step 7: Recovery Simulation & Policy What-If Lab

**Goal**: Explore future strategy projections and policy impact testing.

1. Navigate to **Recovery Simulation** via the sidebar.
2. Run a scenario to visualize projected recovered revenue versus unrecovered leakage over time. *(Note: Simulated revenue is not verified revenue).*
3. Navigate to the **Policy What-If Lab**.
4. Adjust a policy parameter (e.g., max retries) and execute the test to see how strict vs. relaxed policies historically impact recovery rates and operational costs.

*This demonstrates advanced analytics capabilities without exposing real-money financial risk.*

---

## Documentation References

For more detailed technical evaluation of these systems, refer to:
- [Architecture Overview](ARCHITECTURE.md)
- [AI Diagnosis Architecture](AI_DIAGNOSIS.md)
- [Guardrails & Safety Boundaries](GUARDRAILS.md)
- [Razorpay Integration](RAZORPAY_INTEGRATION.md)
- [Webhook Verification](WEBHOOK_VERIFICATION.md)

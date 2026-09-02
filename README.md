# Revenue Sentinel

AI-powered revenue recovery and bounded intervention platform for payment businesses.

## Problem
Payment failures create recoverable revenue leakage for merchants. However, blindly retrying payments alienates customers, violates gateway spam rules, and wastes resources. Merchants need an intelligent, context-aware recovery mechanism that maximizes revenue without jeopardizing the customer relationship or violating safety constraints.

## Solution
Revenue Sentinel detects revenue at risk, evaluates recovery strategies deterministically, respects safety guardrails, orchestrates bounded interventions, measures outcomes, explains decisions, and allows policy What-If analysis—all without mutating production state during analysis.

### Core Capabilities:
- **F10 Guardrails**: Single source of truth for all safety and policy limits (max retries, cooldowns).
- **F11 Strategy Optimization**: Ranks and recommends deterministic recovery strategies.
- **F12 Simulation**: Predicts recovery probability and proves incremental revenue mathematically.
- **F13 Orchestration**: Decides whether to act now, wait, or escalate based on F10 and F11.
- **F14 Outcome Intelligence**: Analyzes historical recovery performance.
- **F15 Decision Explainability**: Reconstructs the exact timeline of "what happened and why."
- **F16 Command Center**: Aggregates all actual vs simulated metrics for the merchant.
- **F17 Policy What-If Lab**: Allows sandboxed policy testing (e.g., "what if I change max retries to 5?") using deep cloning, guaranteeing zero production mutation.

## Safety Architecture
- **Deterministic Decisioning**: No probabilistic AI is used to make monetary or execution decisions.
- **Idempotency & Guardrails**: F10 strictly enforces maximum attempts, cooldowns, and duplicate-prevention.
- **Human Escalation**: High-risk cases are immediately routed for manual review rather than automated action.
- **Actual vs Simulated Separation**: F12 projected metrics are strictly separated from F16 actual outcomes. The system will never present a simulation as actual recovered revenue.
- **Isolated Sandbox**: F17 operates on a deeply cloned `MemoryStore` to evaluate policy impacts safely.

## Demo Sequence (Killer Scenario)

When you run the application, it automatically seeds the store with a deterministic "Killer Scenario" dataset demonstrating various outcomes:
- ₹50,000 → Critical → Retry → Recovered
- ₹25,000 → High → Cooldown / Waiting
- ₹60,000 → Critical → Guardrail Blocked (Stopped)
- ₹15,000 → High → Human Escalation
- ₹8,000 → Medium → Retry → Recovered

**To reproduce the complete demo:**
1. Open the **Command Center**. You will see actual revenue at risk and historical recoveries. (Notice Simulation shows as projected/unavailable).
2. Click **Recovery Cases** and open a high-value case to view the **F11 Strategy** and **F10 Guardrails**.
3. View the **Decision Intelligence** timeline (F15) to understand exactly why a case was retried or blocked.
4. Navigate to **Strategy Performance** to view historical strategy success rates.
5. Click **Run Simulation** (F12) to generate a deterministic projection of how Sentinel improves upon a basic baseline.
6. Return to the **Command Center** to see the newly populated Projected metrics.
7. Open the **Policy What-If Lab** (F17). Change the retry policy to 5 attempts, run the sandbox evaluation, and observe the projected revenue impact without mutating production data.

## Local Development
```bash
# Terminal 1: Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

## Limitations
- **In-Memory Data Store**: Data is volatile and stored in memory for demo purposes.
- **Mocked Payment Provider**: Live execution against Razorpay is currently stubbed/mocked (mock mode).
- **Authentication**: Multi-tenant authentication is currently not implemented for the Buildathon.

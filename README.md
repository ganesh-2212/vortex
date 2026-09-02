# VORTEX

**AI-Powered Revenue Recovery & Decision Intelligence**

VORTEX is an AI-assisted revenue recovery control plane designed to detect payment failures, diagnose their likely causes, determine bounded recovery actions, enforce deterministic safety policies, execute recovery through Razorpay Test Mode, verify outcomes through payment events, and continuously learn from those outcomes.

## Overview
Instead of blindly retrying failed payments, VORTEX treats recovery as a governed decision lifecycle. It proves that AI is incredibly powerful at unstructured diagnosis, while deterministic code remains strictly necessary for safe financial execution.

## The Problem
Payment failures create revenue leakage. However, blindly retrying payments alienates customers, violates gateway spam rules, and wastes resources. Merchants need an intelligent, context-aware recovery mechanism that maximizes revenue without jeopardizing the customer relationship or violating safety constraints.

## What VORTEX Does
The VORTEX recovery lifecycle follows a strict sequence:

**Detect** (revenue event) → **Diagnose** (AI) → **Decide** (optimizer) → **Guard** (policy limits) → **Recover** (checkout) → **Verify** (webhook) → **Measure** (revenue math) → **Learn** (strategy history)

## What the Demo Proves

| Capability | Evidence Demonstrated in VORTEX |
|---|---|
| Revenue risk detection | Failed payments are converted into structured cases with deterministic risk assessment. |
| AI diagnosis | Payment context is analyzed by AI to produce a structured diagnosis and recommendation. |
| Deterministic decisioning | Executable actions are evaluated by deterministic policy. AI cannot force execution. |
| Guardrails | Bounded recovery enforcement (max attempts, cooldowns) before actions are allowed. |
| Razorpay Test Mode recovery | Genuine checkout execution using Razorpay Test Mode integration. |
| Webhook verification | Outcomes are verified via cryptographic signature validation of `payment.captured` webhooks. |
| Recovery measurement | Revenue is accurately measured and tracked through verified states. |
| Strategy intelligence | Historical recovery attempts and successes are segmented by event type to boost future routing. |
| Auditability | Immutable timelines exist for every case documenting exactly what happened and why. |

## Architecture
VORTEX strictly separates its probabilistic intelligence layer from its execution engine, using a React/FastAPI stack connected to Razorpay.
[Read the Architecture Deep Dive](docs/ARCHITECTURE.md)

## Recovery Workflow
A case progresses from `OPEN` to `RECOVERING`, but is only marked `RECOVERED` when accompanied by a valid external payment verification. Actions alone do not constitute recovery.
[Read the Recovery Engine Docs](docs/RECOVERY_ENGINE.md) | [Follow the Demo Runbook](docs/DEMO_RUNBOOK.md)

## AI + Deterministic Decisioning
**AI may only advise and diagnose. Deterministic code decides, limits, executes, and verifies.** The AI cannot directly modify monetary values, bypass retry limits, or override a case state.
[Read the AI Diagnosis Docs](docs/AI_DIAGNOSIS.md) | [Read the Guardrails Docs](docs/GUARDRAILS.md)

## Razorpay Test Mode Integration
Recovery actions operate within a genuine Razorpay Test Mode checkout flow. VORTEX does not assume an intervention was successful until a webhook arrives.
[Read the Razorpay Integration Docs](docs/RAZORPAY_INTEGRATION.md) | [Read the Webhook Verification Docs](docs/WEBHOOK_VERIFICATION.md)

## Revenue & Strategy Intelligence
VORTEX tracks revenue at risk, actual recovered revenue, and recovery attempts. The system feeds back verified outcomes into Strategy Performance statistics to evaluate strategy effectiveness continuously.
[Read the Revenue Evaluation Docs](docs/REVENUE_EVALUATION.md) | [Read the Strategy Learning Docs](docs/STRATEGY_LEARNING.md)

## Product Modules
- **Merchant Command Center**: Aggregated actual revenue metrics.
- **Recovery Cases**: The governed lifecycle queue and AI decision intelligence views.
- **Strategy Performance**: Historical strategy attempts and success rates.
- **Recovery Simulation**: Batch projection of recovery potential without mutating cases.
- **Policy What-If Lab**: A deep-cloned sandbox to test changing policy constraints safely.

## Technology
**Frontend:** React, TypeScript, Vite, Tailwind CSS
**Backend:** Python, FastAPI
**Integration:** Razorpay SDK, Webhooks, Google Gemini (GenAI)

## Getting Started
Ensure you have `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in your `backend/.env`.

```bash
# Terminal 1: Backend
cd backend
python -m venv .venv
# activate virtual environment (e.g. .\.venv\Scripts\Activate.ps1)
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```
[Read the Full Deployment Guide](docs/DEPLOYMENT.md)

## Testing & Validation
The VORTEX backend includes a test suite covering API boundaries, deterministic guardrails, event segmentation, and core logic. 
Run the test suite using: `cd backend && pytest`

## Demo
Start the app and open a high-value case in Recovery Cases to view AI diagnosis and Guardrails. Execute the retry, complete the test payment, and watch the case update based on genuine webhook evidence.
[Follow the Evaluator Demo Runbook](docs/DEMO_RUNBOOK.md)

## Buildathon Alignment
VORTEX perfectly targets Razorpay AI Buildathon Track 03 (AI Revenue Recovery) by focusing not just on identifying failure, but safely bridging the gap between AI reasoning and actual financial execution constraints.
[Read the Evaluator Buildathon Review](docs/BUILDATHON_REVIEW.md)

## Scope & Limitations
- **Test Mode Only**: All payments use Razorpay Test Mode.
- **Simulation**: The Recovery Simulation page processes synthetic batch evaluations. It explicitly separates its projections from actual recovered metrics.
- **In-Memory Store**: Data is volatile and stored in memory for the duration of the demo.

## Documentation
| Document | Purpose |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System architecture and data flow |
| [Demo Runbook](docs/DEMO_RUNBOOK.md) | Reproduce the evaluator demo |
| [AI Diagnosis](docs/AI_DIAGNOSIS.md) | AI intelligence layer |
| [Recovery Engine](docs/RECOVERY_ENGINE.md) | Recovery lifecycle |
| [Guardrails](docs/GUARDRAILS.md) | Safety and execution controls |
| [Razorpay Integration](docs/RAZORPAY_INTEGRATION.md) | Razorpay Test Mode flow |
| [Webhook Verification](docs/WEBHOOK_VERIFICATION.md) | Webhook security and verification |
| [Revenue Evaluation](docs/REVENUE_EVALUATION.md) | Recovery/revenue proof |
| [Strategy Learning](docs/STRATEGY_LEARNING.md) | Strategy performance and learning |
| [Deployment](docs/DEPLOYMENT.md) | Deployment requirements |
| [Buildathon Review](docs/BUILDATHON_REVIEW.md) | Evaluator-focused technical summary |

## Project Status
VORTEX is a final submission project for the Razorpay AI Buildathon.

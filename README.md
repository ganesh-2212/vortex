# VORTEX

## AI-Powered Revenue Recovery & Decision Intelligence

> **Detect revenue at risk. Diagnose the cause. Decide the right intervention. Recover safely. Verify the outcome. Measure what was recovered. Learn from what actually worked.**

VORTEX is an AI-powered revenue recovery and decision intelligence platform built for the **Razorpay AI Revenue Recovery** challenge.

It is designed to move beyond simply identifying failed payments. VORTEX creates an end-to-end recovery loop that detects revenue at risk, diagnoses the likely cause, recommends a recovery strategy, applies deterministic safety controls, executes bounded recovery actions, verifies the payment outcome, measures recovered revenue, and learns from historical recovery outcomes.

---

## 🚀 The Core Idea

A failed payment is not just a transaction failure.

It represents **revenue at risk**.

VORTEX treats recovery as a measurable decision-making problem:

```
Detect
   ↓
Diagnose
   ↓
Decide
   ↓
Guard
   ↓
Recover
   ↓
Verify
   ↓
Measure
   ↓
Learn
```

The goal is **not** to maximize the number of recovery attempts.

The goal is to **maximize safe, verified, and economically meaningful revenue recovery**.

---

## 🎯 The Problem

Payment failures can create significant revenue leakage for merchants.

A traditional payment dashboard may tell a merchant:

> "Payment failed."

But that leaves several important questions unanswered:

- Why did the payment fail?
- How much revenue is actually at risk?
- How urgent is the case?
- What recovery strategy should be attempted?
- Should the system retry automatically?
- How many times should it retry?
- When should recovery stop?
- When should a human intervene?
- Did the recovery action actually recover the revenue?
- Which strategy works best for this type of failure?

VORTEX is designed to answer these questions as one continuous recovery workflow.

---

## 💡 The VORTEX Solution

VORTEX combines:

- Deterministic revenue risk assessment
- AI-powered payment diagnosis
- Strategy optimization
- Deterministic policy enforcement
- Bounded recovery orchestration
- Razorpay Test Mode payment execution
- Webhook-based outcome verification
- Revenue recovery measurement
- Batch simulation and evaluation
- Strategy performance tracking
- Event-specific learning
- Full recovery auditability

The key architectural principle is:

> **AI provides reasoning. Deterministic controls provide authority.**

---

## 🧠 AI + Deterministic Decisioning

VORTEX deliberately does not give an AI model unrestricted control over financial actions.

Instead, the system separates reasoning from execution.

### AI Layer

The AI diagnosis layer can:

- Analyze payment context
- Identify likely root causes
- Provide supporting evidence
- Estimate diagnosis confidence
- Suggest a suitable next action
- Explain the reasoning behind the recommendation

### Deterministic Layer

The deterministic system controls:

- Risk classification
- Strategy selection
- Action eligibility
- Retry limits
- Stopping rules
- Recovery state
- Human escalation
- Action authorization

The flow is:

```
Payment Context
      ↓
AI Diagnosis
      ↓
Suggested Strategy
      ↓
Deterministic Policy
      ↓
Guardrail Evaluation
      ↓
ALLOW / BLOCK / ESCALATE
      ↓
Recovery Execution
```

The AI model **cannot bypass** the deterministic recovery controls.

---

## 🔄 End-to-End Recovery Lifecycle

### 1. Detect

VORTEX receives a revenue event such as:

- `PAYMENT_FAILED`
- `INVOICE_OVERDUE`
- `SUBSCRIPTION_FAILED`
- `CHECKOUT_ABANDONED`

The deterministic risk engine evaluates the event using factors such as:

- Revenue amount
- Event type
- Existing failures
- Case context
- Revenue exposure

The case receives a risk level such as:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

For example, high-value revenue exposure can immediately increase the severity of the case.

### 2. Diagnose

The AI diagnosis layer analyzes the structured payment context.

The resulting diagnosis contains:

- Diagnosis
- Confidence
- Evidence
- Suggested Next Action

**Example:**

```
Diagnosis:
Likely transient payment failure.

Confidence:
High.

Evidence:
- Recent payment failure
- Previous successful transaction
- No evidence of repeated account-level failure

Suggested Action:
Retry Payment
```

AI diagnosis is **advisory**.

If the AI provider is unavailable, times out, returns malformed output, or cannot safely determine a diagnosis, VORTEX uses a deterministic fallback rather than failing open.

### 3. Decide

VORTEX evaluates available recovery strategies.

Possible strategies include:

- Immediate payment retry
- Customer reminder
- Alternative payment method
- Human escalation
- Stop recovery

The strategy optimizer can use historical recovery performance when sufficient evidence exists.

This allows future recommendations to be influenced by what actually worked previously.

### 4. Guard

Every recovery action is evaluated by deterministic guardrails before execution.

Examples include:

**Retry limit**
```
Maximum retry attempts = 3
```

**Recovered case**
```
RECOVERED
    ↓
Further recovery actions blocked
```

**Stopped case**
```
STOPPED
    ↓
Normal recovery actions blocked
    ↓
Stop / Human Escalation remain available
```

**Human escalation**

When automated recovery should no longer continue, the system can escalate the case for human intervention.

### 5. Recover

Once an action is approved, VORTEX executes the bounded recovery workflow.

For payment recovery, the system can create a Razorpay Test Mode payment flow.

The system tracks:

- Recovery case
- Recovery action
- Attempt number
- Action status
- Order ID
- Payment ID
- Execution result

A recovery attempt is **not** automatically treated as a successful recovery.

### 6. Verify

A recovery is considered successful only after the payment outcome is verified.

The Razorpay Test Mode flow is:

```
Recovery Action
      ↓
Razorpay Test Checkout
      ↓
Test Payment
      ↓
Webhook
      ↓
Signature Verification
      ↓
Payment Captured
      ↓
Recovery Confirmed
```

This creates a critical distinction between:

- **Attempted Recovery**

and:

- **Verified Recovery**

### 7. Measure

VORTEX measures the economic result of recovery.

Key metrics include:

- Total revenue at risk
- Revenue recovered
- Recovery rate
- Baseline recovery
- Incremental recovered revenue
- Intervention cost
- Net recovered revenue
- Total recovery attempts
- Escalations
- Guardrail blocks
- Stopping-rule compliance

The objective is to demonstrate measurable revenue recovery rather than merely successful API calls.

### 8. Learn

Recovery outcomes are fed back into strategy performance.

```
Recovery Outcome
       ↓
Strategy Performance
       ↓
Historical Attempts
       ↓
Historical Success Rate
       ↓
Future Recommendation
```

When sufficient historical evidence exists, future recommendations use observed recovery performance instead of relying only on heuristic assumptions.

---

## 📊 Batch Revenue Recovery Proof

VORTEX includes a Recovery Simulation designed to evaluate recovery behavior across a batch of cases.

Instead of demonstrating a single successful case, the system evaluates recovery performance across multiple scenarios.

The evaluation compares:

```
Baseline Recovery
       vs
VORTEX Recovery
```

and measures:

- Cases evaluated
- Revenue at risk
- Baseline recovered revenue
- VORTEX recovered revenue
- Recovery rate
- Incremental revenue
- Intervention cost
- Net recovered revenue
- Total attempts
- Escalations
- Guardrail blocks
- Stopping-rule compliance

> **Important:** The batch simulation uses synthetic evaluation data. Synthetic evaluation results are intentionally kept separate from the genuine Razorpay Test Mode payment recovery demonstrated by VORTEX.

### Batch Evaluation

| Metric | Result |
|---|---|
| Cases evaluated | [INSERT ACTUAL VALUE] |
| Revenue at risk | ₹[INSERT ACTUAL VALUE] |
| Baseline recovered | ₹[INSERT ACTUAL VALUE] |
| VORTEX recovered | ₹[INSERT ACTUAL VALUE] |
| Incremental revenue | ₹[INSERT ACTUAL VALUE] |
| Recovery rate | [INSERT ACTUAL VALUE]% |
| Net recovered revenue | ₹[INSERT ACTUAL VALUE] |
| Total attempts | [INSERT ACTUAL VALUE] |
| Escalations | [INSERT ACTUAL VALUE] |
| Guardrail blocks | [INSERT ACTUAL VALUE] |
| Stopping-rule compliance | [INSERT ACTUAL VALUE]% |

---

## 💳 Razorpay Test Mode Integration

VORTEX integrates with Razorpay Test Mode to demonstrate an actual end-to-end payment recovery lifecycle.

The demonstrated flow is:

```
Failed Payment
      ↓
Revenue Risk Assessment
      ↓
Recovery Case
      ↓
AI Diagnosis
      ↓
Strategy Recommendation
      ↓
Guardrail Evaluation
      ↓
Razorpay Test Mode Checkout
      ↓
Test Payment
      ↓
Razorpay Webhook
      ↓
Signature Verification
      ↓
Payment Captured
      ↓
Recovery Action Executed
      ↓
Case = RECOVERED
      ↓
Revenue Recovered
```

The payment demonstration uses Razorpay Test Mode.

**No real customer funds are moved as part of the demonstration.**

---

## 🔐 Safety Model

VORTEX treats financial recovery actions as controlled operations.

The system uses deterministic guardrails to prevent unsafe or unnecessary recovery behavior.

### Core safety principles

- AI is advisory
- Financial execution is deterministic
- Retry attempts are bounded
- Recovered cases cannot continue normal recovery
- Stopped cases cannot continue normal recovery
- Human escalation remains available
- Actions are auditable
- Payment outcomes are verified
- Synthetic evaluation is separated from real payment verification

The core principle is:

```
Probabilistic Reasoning
          +
Deterministic Controls
          +
Verified Payment Outcomes
          =
Bounded Recovery Automation
```

---

## 🧾 Audit Trail

VORTEX maintains an auditable recovery lifecycle.

Important events can include:

- Revenue event creation
- Risk assessment
- AI diagnosis
- Strategy recommendation
- Guardrail evaluation
- Recovery action creation
- Recovery action execution
- Payment outcome
- Recovery confirmation
- Strategy performance update

This allows the system to answer:

- What happened?
- Why did it happen?
- Which action was attempted?
- Was the action allowed?
- Did the payment actually succeed?
- Why did the system stop?
- How did this outcome affect future strategy recommendations?

---

## 📈 Strategy Performance

VORTEX tracks recovery strategy performance over time.

For each strategy, the system can measure:

- Attempts
- Successful recoveries
- Recovery rate
- Recovered amount
- Intervention cost
- Net recovery

**Example:**

| Strategy | Attempts | Successes | Recovery Rate | Net Recovery |
|---|---|---|---|---|
| Immediate Retry | [VALUE] | [VALUE] | [VALUE]% | ₹[VALUE] |
| Reminder | [VALUE] | [VALUE] | [VALUE]% | ₹[VALUE] |
| Alternative Method | [VALUE] | [VALUE] | [VALUE]% | ₹[VALUE] |

The system requires sufficient historical evidence before relying on empirical strategy performance for future recommendations.

This avoids treating a single recovery as statistically meaningful.

---

## 🧩 Event-Specific Strategy Learning

Recovery strategies do not necessarily perform equally across every type of revenue event.

VORTEX therefore segments strategy performance by event type.

For example:

```
PAYMENT_FAILED
      ↓
Strategy Performance

INVOICE_OVERDUE
      ↓
Strategy Performance

SUBSCRIPTION_FAILED
      ↓
Strategy Performance
```

This prevents a strategy's performance for one event category from incorrectly influencing recommendations for another.

**Example:**

| Event Type | Strategy | Attempts | Success Rate |
|---|---|---|---|
| PAYMENT_FAILED | Immediate Retry | [VALUE] | [VALUE]% |
| INVOICE_OVERDUE | Reminder | [VALUE] | [VALUE]% |
| SUBSCRIPTION_FAILED | Immediate Retry | [VALUE] | [VALUE]% |

---

## 🧠 Recovery Learning Loop

The learning loop is outcome-driven.

VORTEX does not simply record that an action was executed.

It evaluates whether the action actually produced a verified recovery outcome.

```
Action Executed
      ↓
Payment Outcome
      ↓
Recovery Confirmed / Failed
      ↓
Strategy Statistics Updated
      ↓
Event-Specific Performance
      ↓
Future Recommendation
```

This allows the recovery engine to gradually replace assumptions with observed evidence.

---

## 🖥️ Product Modules

### Command Center

The merchant-facing operational overview.

Provides visibility into:

- Revenue at risk
- Recoverable revenue
- Recovery activity
- Recovery outcomes
- Active recovery cases

### Recovery Cases

Provides case-level visibility into:

- Revenue event
- Risk level
- Revenue at risk
- AI diagnosis
- Evidence
- Recommended strategy
- Recovery actions
- Case state
- Recovery outcome
- Audit history

### Decision Intelligence

Provides detailed visibility into the reasoning behind a recovery recommendation.

Displays:

- Root cause diagnosis
- Confidence
- Evidence
- Suggested action
- Decision context
- Safety constraints

### Recovery Simulation

Provides batch-level evaluation of recovery performance.

Measures:

- Baseline recovery
- VORTEX recovery
- Incremental revenue
- Net recovery
- Attempts
- Escalations
- Guardrail blocks
- Stopping-rule compliance

### Strategy Performance

Shows historical recovery strategy performance.

Tracks:

- Attempts
- Successes
- Recovery rate
- Recovered revenue
- Intervention cost
- Net recovery

### What-If Analysis

Allows recovery policy scenarios to be evaluated before changing operational behavior.

This provides a controlled way to understand potential strategy and policy outcomes.

### Activity Feed

Provides a chronological operational view of important recovery events.

### Guardrails

Provides visibility into the deterministic safety policies controlling recovery actions.

---

## 🏗️ Architecture

```
                       ┌───────────────────────┐
                       │    Revenue Events      │
                       │ Payment / Invoice /    │
                       │ Subscription / Cart    │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │  Revenue Risk Engine   │
                       │ Deterministic Scoring  │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │     AI Diagnosis       │
                       │ Root Cause + Evidence  │
                       │ + Suggested Action     │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │   Strategy Optimizer   │
                       │  Historical Evidence   │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │  Policy + Guardrails   │
                       │ Deterministic Control  │
                       └───────────┬────────────┘
                                   │
                           ┌───────┴───────┐
                           │               │
                         ALLOW           BLOCK
                           │               │
                           ▼               ▼
                  ┌────────────────┐ ┌─────────────┐
                  │    Recovery    │ │ Audit Trail │
                  │  Orchestrator  │ └─────────────┘
                  └───────┬────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │ Razorpay Test  │
                  │      Mode      │
                  └───────┬────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │    Webhook     │
                  │  Verification  │
                  └───────┬────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │ Recovery       │
                  │ Outcome        │
                  └───────┬────────┘
                          │
                 ┌────────┴────────┐
                 │                 │
                 ▼                 ▼
          ┌─────────────┐   ┌───────────────┐
          │ Audit Trail │   │    Strategy    │
          │             │   │  Performance   │
          └─────────────┘   └───────┬────────┘
                                    │
                                    ▼
                             Event-Specific
                                Learning
```

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- Pydantic
- Pytest

### AI
- Google Gemini
- google-genai

### Payments
- Razorpay Test Mode
- Razorpay Webhooks

### Data
- PostgreSQL-compatible database schema
- In-memory repository for application/test workflows

---

## 📁 Project Structure

```
vortex/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── ...
│   │
│   └── tests/
│
├── database/
│   └── migrations/
│
├── docs/
│
├── scripts/
│
├── tests/
│
├── README.md
└── ...
```

---

## ⚙️ Local Development

### Prerequisites

Install:

- Node.js
- npm
- Python 3.x
- Git

For AI and Razorpay Test Mode functionality, configure the required API credentials.

### Clone the Repository

```bash
git clone [YOUR_PUBLIC_GITHUB_REPOSITORY]

cd [YOUR_REPOSITORY_NAME]
```

### Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### Environment Variables

Create a local environment configuration with the required credentials.

Example:

```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
```

**Never commit API keys or secrets to the repository.**

### Start the Backend

```bash
uvicorn app.main:app --reload
```

### Frontend Setup

Open a second terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The Vite development server will start locally.

---

## 🧪 Testing

VORTEX includes automated backend tests covering the core revenue recovery workflow.

The final regression suite currently reports:

```
47 passed
3 warnings
```

The test coverage includes areas such as:

- Revenue risk assessment
- Recovery case creation
- Recovery actions
- Guardrails
- Recovery orchestration
- Strategy optimization
- Strategy performance
- AI diagnosis safety
- Recovery simulation
- Revenue recovery proof
- Learning loop
- Event-specific segmentation
- Razorpay recovery flow
- Recovery outcome handling

Run the backend tests with:

```bash
pytest -q
```

---

## 🏭 Frontend Production Build

To create a production build:

```bash
cd frontend
npm run build
```

---

## 🔗 Razorpay Webhook Flow

The Razorpay webhook layer is responsible for processing payment outcomes.

The recovery flow includes:

```
Webhook Request
      ↓
Validation
      ↓
Signature Verification
      ↓
Idempotency Handling
      ↓
Payment Event Processing
      ↓
Recovery Action Finalization
      ↓
Case Recovery Confirmation
      ↓
Audit Logging
```

A recovery case is **not** marked as successfully recovered merely because a payment order was created.

The successful payment outcome must be processed through the verified webhook lifecycle.

---

## 🎥 Recommended Demo Flow

The recommended VORTEX demonstration is:

1. **Create a failed revenue event** — Show the payment/revenue event entering the system.
2. **Open the recovery case** — Show Revenue at Risk, Risk Level, Customer Context.
3. **Show AI diagnosis** — Display Root Cause, Confidence, Evidence, Suggested Action.
4. **Show the deterministic decision** — Demonstrate that the AI recommendation passes through policy and guardrails.
5. **Execute recovery** — Create the Razorpay Test Mode payment flow.
6. **Complete the test payment** — Complete the Razorpay Test Mode checkout.
7. **Show webhook verification** — Demonstrate: Payment Captured → Recovery Action Executed → Case = RECOVERED.
8. **Show recovered revenue** — Return to the VORTEX dashboard.
9. **Run the batch evaluation** — Show Cases, Revenue at Risk, Recovered Revenue, Incremental Revenue, Net Recovery, Safety Metrics.
10. **Show strategy learning** — Open Strategy Performance and demonstrate how recovery outcomes contribute to future recommendations.

---

## 📸 Product Screenshots

### Command Center
Add the primary VORTEX dashboard screenshot here.

`[ADD COMMAND CENTER SCREENSHOT]`

### Recovery Case
Show the case containing risk assessment, AI diagnosis, recommendation, and recovery state.

`[ADD RECOVERY CASE SCREENSHOT]`

### Decision Intelligence
Show AI diagnosis and decision reasoning.

`[ADD DECISION INTELLIGENCE SCREENSHOT]`

### Recovery Simulation
Show batch-level revenue recovery proof.

`[ADD RECOVERY SIMULATION SCREENSHOT]`

### Strategy Performance
Show strategy-level historical performance.

`[ADD STRATEGY PERFORMANCE SCREENSHOT]`

### Razorpay Test Mode
Show the verified Razorpay Test Mode recovery.

`[ADD RAZORPAY TEST MODE SCREENSHOT]`

---

## 🏆 What VORTEX Demonstrates

| Capability | VORTEX Implementation |
|---|---|
| Revenue risk detection | Deterministic risk engine |
| AI diagnosis | Gemini-based structured diagnosis |
| Strategy selection | Recovery strategy optimizer |
| Financial safety | Deterministic policy and guardrails |
| Bounded execution | Recovery orchestration |
| Payment execution | Razorpay Test Mode |
| Payment verification | Razorpay webhook |
| Recovery measurement | Revenue and recovery metrics |
| Batch evaluation | Recovery Simulation |
| Incremental revenue proof | Baseline vs VORTEX comparison |
| Auditability | Recovery actions and audit events |
| Strategy learning | Outcome-driven strategy performance |
| Event segmentation | Event-specific strategy performance |

---

## 🔬 Evaluation Approach

VORTEX separates different types of evidence.

**AI Evidence** — Shows Diagnosis, Confidence, Evidence, Suggested action.

**Synthetic Evaluation Evidence** — Shows how VORTEX behaves across a controlled batch of recovery scenarios.

**Payment Execution Evidence** — Shows an actual payment recovery lifecycle through Razorpay Test Mode.

This distinction is intentional.

Synthetic simulation results are not presented as real merchant revenue.

Razorpay Test Mode recovery is presented separately as payment execution evidence.

---

## ⚖️ Safety Principles

VORTEX follows four core principles:

1. **AI is advisory** — AI provides diagnosis and recommendations.
2. **Deterministic controls have authority** — Policies and guardrails determine whether an action can execute.
3. **Recovery must be verified** — A recovery attempt is not equivalent to recovered revenue.
4. **Every important decision should be explainable** — Recovery actions and outcomes are recorded for auditability.

---

## 🚧 Current Limitations

VORTEX is a buildathon prototype rather than a production financial infrastructure system.

Current limitations include:

- Demonstrated payment recovery uses Razorpay Test Mode.
- Batch evaluation uses synthetic data.
- AI diagnosis is advisory.
- Production-grade authentication and authorization are outside the current prototype scope.
- Production deployment would require stronger multi-tenant isolation.
- Production financial workflows would require additional compliance and operational review.

These boundaries are intentional and prevent the prototype from overstating its capabilities.

---

## 🔮 Future Scope

VORTEX can be extended into additional revenue recovery workflows such as:

- Failed subscription recovery
- Checkout abandonment recovery
- Invoice and B2B receivables recovery
- Mandate retry sequencing
- Merchant-configurable recovery policies
- Customer communication workflows
- Human approval workflows
- Controlled recovery experiments
- Advanced cohort-level optimization
- Production-grade multi-tenant architecture
- Expanded payment failure diagnosis

---

## 📚 Development Milestones

VORTEX was developed incrementally through feature branches.

Major milestones:

```
F11 — Recovery Strategy Optimization
        ↓
F12 — Recovery Simulation & Incremental Revenue Proof
        ↓
F13 — Recovery Orchestration & Adaptive Scheduling
        ↓
F14 — Strategy Performance
        ↓
F15 — Decision Explainability
        ↓
F16 — Merchant Command Center
        ↓
F17 — Policy What-If
        ↓
F18 — Final Hardening
        ↓
F19 — AI Diagnosis
        ↓
F20 — Batch Revenue Proof
        ↓
F21 — Learning Loop
        ↓
F22 — Event-Specific Strategy Segmentation
```

The completed development history has been integrated into the final main branch.

---

## 🧭 Design Philosophy

VORTEX is built around one principle:

> Don't just identify lost revenue. Build a controlled loop that can recover it, prove that it was recovered, and learn from the outcome.

The system therefore combines:

```
AI Reasoning
      +
Deterministic Decisioning
      +
Bounded Execution
      +
Verified Payment Outcomes
      +
Economic Measurement
      +
Outcome-Driven Learning
```

---

## 📌 Buildathon Focus

VORTEX was developed for the AI Revenue Recovery track of the Razorpay AI Buildathon.

The project focuses on the complete recovery workflow:

```
Revenue at Risk
      ↓
Diagnosis
      ↓
Intervention
      ↓
Safety Controls
      ↓
Recovery
      ↓
Verification
      ↓
Measured Revenue
      ↓
Learning
```

The objective is to demonstrate that AI can participate in financial recovery workflows while keeping execution:

- Bounded
- Deterministic where it matters
- Auditable
- Measurable
- Verifiable

---

## 🎬 5-Minute Pitch Structure

The recommended pitch structure is:

| Time | Section |
|---|---|
| 0:00 – 0:30 | Problem + VORTEX overview |
| 0:30 – 1:15 | Revenue risk detection + AI diagnosis |
| 1:15 – 2:00 | Strategy selection + deterministic guardrails |
| 2:00 – 3:00 | Razorpay Test Mode recovery |
| 3:00 – 4:00 | Batch revenue recovery proof |
| 4:00 – 4:30 | Strategy learning + event segmentation |
| 4:30 – 5:00 | Architecture + safety + final results |

---

## 🔗 Links

- GitHub: `[ADD GITHUB REPOSITORY]`
- Live Demo: `[ADD LIVE DEMO URL]`
- Demo Video: `[ADD VIDEO URL]`
- Architecture: `[ADD ARCHITECTURE LINK IF APPLICABLE]`

---

## 👨‍💻 Project

**VORTEX**

*AI-Powered Revenue Recovery & Decision Intelligence*

Recover revenue. Prove the outcome. Learn what works.

---

## Final README Checklist

Before committing this README, replace the following placeholders:

- [ ] `[INSERT ACTUAL VALUE]` in the batch metrics.
- [ ] `[ADD ... SCREENSHOT]` sections with actual screenshots.
- [ ] `[YOUR_PUBLIC_GITHUB_REPOSITORY]` / repository links.
- [ ] `[YOUR_REPOSITORY_NAME]` with the actual repository name.
- [ ] `[ADD LIVE DEMO URL]` with the deployed application URL.
- [ ] `[ADD VIDEO URL]` with the final pitch/demo video.
- [ ] `[ADD ARCHITECTURE LINK IF APPLICABLE]` if a separate architecture document exists.

### Important accuracy notes

- Do not claim PostgreSQL is the active runtime database if the current implementation uses the in-memory repository.
- Keep synthetic batch evaluation results separate from genuine Razorpay Test Mode payment evidence.
- Do not describe VORTEX as having unrestricted autonomous control over financial actions.

The strongest product story is:

```
AI Diagnosis
      ↓
Deterministic Guardrails
      ↓
Razorpay Test Mode
      ↓
Verified Recovery
      ↓
Batch Revenue Proof
      ↓
Strategy Learning
```

---

**VORTEX**

*AI-Powered Revenue Recovery & Decision Intelligence*

Recover revenue. Prove the outcome. Learn what works.
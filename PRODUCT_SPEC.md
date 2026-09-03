# VORTEX — Product Specification

## AI-Powered Revenue Recovery & Decision Intelligence

**Executive Summary**  
VORTEX is an AI-assisted revenue recovery and decision-intelligence platform. It is designed to solve the critical business problem of identifying revenue at risk, diagnosing probable causes, selecting bounded recovery actions, executing approved actions safely, verifying outcomes, and measuring recovery performance. By systematically closing the loop from failure detection to verified payment, VORTEX transforms unpredictable revenue leakage into a governed, measurable, and continuously improving recovery lifecycle.

---

## 1. PRODUCT OVERVIEW

VORTEX operates on the principle that detecting a payment failure is only the first step. True revenue recovery requires understanding *why* the failure occurred, selecting an appropriate intervention, and executing it within strict financial safety bounds.

VORTEX connects these distinct stages under a tightly controlled execution model:
**Detection → Diagnosis → Decision → Intervention → Verification → Measurement → Learning**

By introducing AI strictly for contextual reasoning and strategy optimization—while reserving execution authority for deterministic backend policies—VORTEX provides intelligent recovery without sacrificing financial safety.

---

## 2. PROBLEM STATEMENT

Revenue leakage rarely happens as a single, easily resolvable event. Merchants and payment platforms face complex leakage scenarios, including:
- Standard payment gateway failures
- Checkout abandonment
- Payment-method degradation (e.g., expired cards, insufficient funds)
- Subscription and recurring payment failures
- Delayed or overdue invoice receivables

**The Limitation of Current Systems**  
Traditional systems often excel at *detecting* failures but fail to close the loop. Merchants typically resort to blind, automated retries that can frustrate customers, trigger gateway spam limits, or incur unnecessary intervention costs. 

**The VORTEX Problem Definition**  
*How can a payment business or merchant identify revenue at risk, understand why it is at risk, choose a contextually appropriate intervention, execute that intervention within explicit safety boundaries, mathematically verify whether it worked, and measure the resulting recovered revenue to inform future strategies?*

---

## 3. PRODUCT OBJECTIVE

VORTEX aims to provide a controlled revenue recovery loop that transforms payment and revenue failure events into explainable, policy-governed recovery decisions and mathematically verifiable outcomes.

The platform's core objectives are:
- **Detection**: Deterministically assess financial risk upon a failure event.
- **Diagnosis**: Utilize AI to analyze the likely root cause of the failure.
- **Decisioning**: Recommend interventions based on historical success rates.
- **Controlled Execution**: Enforce strict deterministic safety limits (guardrails) before authorizing any financial action.
- **Verification**: Demand cryptographic proof of payment completion (e.g., webhooks) before declaring a recovery successful.
- **Measurement**: Accurately attribute recovered revenue.
- **Historical Intelligence**: Statistically learn from verified outcomes to continuously optimize future strategy recommendations.

---

## 4. CORE PRODUCT PIPELINE

The VORTEX lifecycle follows a strict progression from ingestion to audit:

```text
Payment / Revenue Event
        ↓
Event Ingestion
        ↓
Event Normalization
        ↓
Revenue Risk Assessment
        ↓
Incident / Recovery Case Creation
        ↓
Evidence Aggregation
        ↓
AI Investigation & Diagnosis
        ↓
Root-Cause & Strategy Recommendation
        ↓
Deterministic Policy Evaluation (Guardrails)
        ↓
Bounded Recovery Execution (Razorpay Test Mode)
        ↓
Payment / External Outcome
        ↓
Webhook Verification
        ↓
Recovery Measurement
        ↓
Audit / Historical Intelligence
```

---

## 5. PRODUCT BOUNDARIES & TRUST MODEL

VORTEX enforces a strict separation between intelligence and execution.

### AI Responsibilities (Advisory)
Google Gemini AI is utilized exclusively for:
- Incident investigation
- Root-cause hypothesis generation
- Evidence interpretation
- Contextual intervention recommendation
- Merchant-friendly explanations

### Deterministic Responsibilities (Authoritative)
Application code (the backend Policy & Guardrail engine) definitively handles:
- Financial and monetary calculations
- Risk thresholds and severity assignment
- Maximum retry limits and cooldown enforcement
- Action authorization (Allow/Block)
- Stopping conditions (e.g., case resolved, limits exhausted)
- External payment execution and webhook verification
- Audit logging and idempotency

*AI recommends. Deterministic policy decides. Verified payment events determine the outcome.*

---

## 6. PRIMARY USERS

### 1. Merchant / Operator
**Needs:**
- Real-time visibility into revenue leakage.
- Plain-text explanations of why revenue is at risk.
- Actionable, historically backed recovery recommendations.
- Visibility into intervention status and expected recovery.
- A verifiable audit history of all automated actions.

### 2. Payment Platform / Administrator
**Needs:**
- Aggregate payment health monitoring.
- Detection of payment method degradation.
- System-wide strategy effectiveness tracking.
- Guarantees of intervention safety and policy compliance.

---

## 7. MAIN PRODUCT AREAS

Current implementation status is marked relative to the Razorpay Buildathon repository evidence.

1. **Revenue Command Center** *(Implemented)*: High-level overview of revenue at risk, recovery rates, and active cases.
2. **Active Incidents & Recovery Cases** *(Implemented)*: The governed pipeline managing individual failure events.
3. **Decision Intelligence & Investigation** *(Implemented)*: UI surfacing Gemini AI root-cause analysis and strategy recommendations.
4. **Strategy Performance** *(Implemented)*: Analytics tracking historical success rates and net recovered value segmented by event type.
5. **Recovery Orchestration & Execution** *(Implemented)*: Bounded Razorpay Checkout flow driven by the backend.
6. **Policy Center & Guardrails** *(Implemented)*: Backend logic enforcing max retries, cooldowns, and stopping rules.
7. **Recovery Simulation & What-If Lab** *(Implemented)*: Synthetic projection tools evaluating expected revenue vs. actual outcomes without executing real payments.
8. **Audit Trail** *(Implemented)*: Immutable timeline of all system and external webhook events.
9. **Authentication & Multi-Tenant Context** *(Designed / Planned)*: Scoped data access for multiple merchants.
10. **Automated Rollback Engine** *(Designed / Planned)*: Capability to safely reverse complex multi-stage financial interventions.

---

## 8. DEVELOPMENT ROADMAP & MILESTONES

The F01–F35 build milestones map the complete VORTEX product vision. Note: Milestones marked *[Implemented]* reflect current Buildathon repository capabilities. Milestones marked *[Planned/Designed]* represent the broader production roadmap.

**Foundation & Data Ingestion**
- F01 Repository and project foundation *[Implemented]*
- F02 Architecture and configuration *[Implemented]*
- F03 Database foundation *[Implemented - In-Memory Volatile Store]* *[Planned - PostgreSQL]*
- F04 Authentication and merchant context *[Designed]*
- F05 Razorpay webhook ingestion *[Implemented]*
- F06 Webhook signature validation *[Implemented]*
- F07 Idempotency *[Implemented]*
- F08 Event normalization *[Implemented]*
- F09 Payment persistence *[Implemented - Volatile]*

**Intelligence & Risk**
- F10 Revenue metrics *[Implemented]*
- F11 Historical baseline *[Implemented]*
- F12 Segmentation *[Implemented]*
- F13 Anomaly detection *[Designed - Extended statistical anomaly detection]*
- F14 Revenue-at-risk calculation *[Implemented]*

**Investigation & Diagnosis**
- F15 Incident management (Recovery Cases) *[Implemented]*
- F16 Evidence aggregation *[Implemented]*
- F17 Gemini investigator *[Implemented]*
- F18 Root-cause ranking *[Implemented]*
- F19 AI confidence model *[Implemented - Advisory Confidence]*

**Policy & Execution**
- F20 Intervention recommendations *[Implemented]*
- F21 Intervention risk scoring *[Implemented - Strategy Optimizer]*
- F22 Merchant policy engine (Guardrails) *[Implemented]*
- F23 Approval workflow *[Implemented]*
- F24 Controlled intervention executor *[Implemented - Razorpay Test Mode]*

**Monitoring & Audit**
- F25 Intervention monitoring *[Implemented]*
- F26 Stop conditions *[Implemented]*
- F27 Rollback *[Designed]*
- F28 Recovery measurement *[Implemented]*
- F29 Audit trail *[Implemented]*

**Analytics & UI**
- F30 Synthetic transaction generator *[Implemented - Webhook Simulator]*
- F31 Replay/Simulation engine *[Implemented]*
- F32 Killer scenario (Policy What-If) *[Implemented]*
- F33 Evaluation engine *[Implemented]*
- F34 Merchant dashboard *[Implemented]*
- F35 Final integration and hardening *[Implemented - Buildathon Scope]*
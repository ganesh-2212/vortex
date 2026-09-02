# VORTEX Architecture

VORTEX is architected to clearly separate probabilistic intelligence from deterministic financial execution.

## High-Level Architecture

The system consists of three main tiers:

1. **Frontend (React/TypeScript)**  
   Provides the Merchant Command Center, Recovery Case details, Strategy Performance analytics, recovery simulation, decision intelligence, and the Razorpay checkout experience.

2. **Backend (FastAPI/Python)**  
   Houses the API layer, AI intelligence layer, recovery orchestration, deterministic policy and guardrails, strategy intelligence, and Razorpay webhook handling.

3. **State Layer**  
   For the purposes of the Buildathon, VORTEX uses an in-memory `MemoryStore` to represent application state. This keeps the demonstration self-contained and does not represent a production persistence architecture.

---

## Core Modules

### 1. AI Intelligence Layer (`ai_diagnosis.py`)

Responsible for interpreting payment failure context and producing a structured diagnosis.

It can provide:

- Root-cause analysis
- Supporting evidence
- Risk explanation
- Confidence score
- Recommended recovery action

**Crucially, this layer has no financial execution authority.**

---

### 2. Deterministic Policy & Guardrails (`guardrails.py`)

Evaluates proposed recovery actions against deterministic safety rules.

Examples include:

- Maximum retry attempts
- Case lifecycle state
- Allowed recovery actions
- Recovery stopping conditions
- Escalation requirements
- Protection of already-recovered cases

If the AI recommends a retry but the policy does not permit it, the guardrail layer blocks the action.

---

### 3. Recovery Orchestration (`recovery_orchestrator.py`)

Coordinates the recovery workflow for a case.

It brings together:

- Case state
- AI diagnosis
- Strategy intelligence
- Deterministic policy evaluation
- Recovery actions
- Outcome tracking

The orchestrator ensures that a recommended action passes the required safety checks before it can proceed.

---

### 4. Strategy Intelligence (`strategy_performance.py` & `strategy_optimizer.py`)

Records historical recovery attempts and their outcomes, including:

- Recovery attempts
- Successful recoveries
- Failed attempts
- Recovery value
- Action costs
- Strategy performance

VORTEX uses this historical evidence to rank recovery strategies. Performance can also be segmented by event type so that strategy selection is based on relevant historical outcomes rather than treating every failure as identical.

This forms the basis of the **Learning Loop**.

---

### 5. Execution & Verification (`razorpay_service.py` & Webhooks)

Handles the Razorpay Test Mode recovery flow.

The execution layer:

1. Creates Razorpay Test Mode orders.
2. Presents the approved recovery action through Razorpay Checkout.
3. Processes the payment through Razorpay Test Mode.
4. Verifies the resulting payment.
5. Processes Razorpay webhook events.
6. Updates the recovery case only after successful payment verification.

The external payment event is treated as the source of truth for the recovery outcome.

---

## Data & Decision Flow

The core recovery lifecycle is:

flowchart TD
    A["Failed Payment / Revenue Event"]
    B["Risk Assessment"]
    C["AI Diagnosis"]
    D["Strategy Selection"]
    E["Policy & Guardrails"]
    F{"Action Allowed?"}
    G["No Action / Escalation"]
    H["Recovery Action"]
    I["Razorpay Test Mode"]
    J["Payment Verification"]
    K{"Payment Verified?"}
    L["Recovery Confirmed"]
    M["Revenue Measurement"]
    N["Strategy History / Learning Loop"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F

    F -->|No| G
    F -->|Yes| H

    H --> I
    I --> J
    J --> K

    K -->|No| G
    K -->|Yes| L

    L --> M
    M --> N
    N --> D

    C -.->|"AI advises"| D
    E -.->|"Deterministic control"| H
    J -.->|"Verified payment evidence"| M

## Step-by-Step Flow

### 1. Ingestion

A failed payment or revenue event enters the recovery workflow and is represented as a recovery case.

### 2. Risk Assessment

VORTEX evaluates the event and determines the case's recovery risk level.

### 3. Diagnosis

The AI intelligence layer interprets the available payment and case context and recommends a potential intervention.

### 4. Strategy Selection

Strategy intelligence uses available historical performance evidence to determine the appropriate recovery strategy.

### 5. Validation

Deterministic policy and guardrails evaluate whether the proposed action is permitted.

### 6. Execution

If authorized, the recovery action proceeds through the supported Razorpay Test Mode flow.

### 7. Verification

Razorpay payment events are validated before the system considers the payment successfully recovered.

### 8. Measurement

The verified outcome updates recovery metrics and strategy performance data.

### 9. Learning Loop

Verified historical outcomes become evidence for future strategy ranking and decision intelligence.

---

## The Trust Boundary

The core architectural principle of VORTEX is the trust boundary between AI reasoning and financial execution.

### AI Layer

AI may:

- Diagnose
- Interpret
- Explain
- Estimate
- Recommend

### Deterministic Layer

Deterministic code controls:

- Policy decisions
- Retry limits
- Allowed actions
- Case state transitions
- Financial calculations
- Recovery execution
- Payment verification

The AI cannot directly:

- Modify monetary values
- Bypass retry limits
- Override recovery case states
- Authorize a blocked action
- Execute an arbitrary payment action

This separation ensures that probabilistic AI can provide useful intelligence without becoming an uncontrolled financial execution authority.

> **AI recommends. Deterministic policy decides. Verified payment events determine the outcome.**
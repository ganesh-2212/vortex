# VORTEX Architecture

VORTEX is architected to clearly separate probabilistic intelligence (AI) from deterministic financial execution.

## High-Level Architecture

The system consists of three main tiers:
1.  **Frontend (React/TypeScript)**: Provides the Merchant Command Center, Recovery Case details, Strategy Performance analytics, and the Razorpay checkout experience.
2.  **Backend (FastAPI/Python)**: Houses the API, AI intelligence layer, recovery orchestration, deterministic guardrails, and webhook listeners.
3.  **State Layer**: For the purposes of the Buildathon, VORTEX uses an in-memory `MemoryStore` to represent database state.

## Core Modules

### 1. AI Intelligence Layer (`ai_diagnosis.py`)
Responsible for reading unstructured payment failure context and producing a structured diagnosis. It outputs a root cause, supporting evidence, confidence score, and a recommended action. **Crucially, this layer has no execution authority.**

### 2. Deterministic Policy & Guardrails (`guardrails.py`)
Evaluates any proposed recovery action against strict, deterministic rules (e.g., maximum retry attempts, minimum cooldown intervals). If the AI recommends a retry but the policy forbids it, the guardrail layer blocks the action.

### 3. Recovery Orchestration (`recovery_orchestrator.py`)
Manages the state machine of a recovery case. It triggers the AI diagnosis, queries strategy performance statistics, checks guardrails, and decides if an action can be executed, delayed, or escalated.

### 4. Strategy Intelligence (`strategy_performance.py` & `strategy_optimizer.py`)
Records the outcomes of past recovery attempts (successes, failures, costs). Uses this historical evidence to dynamically rank strategies for new cases based on event-type segmentation (The Learning Loop).

### 5. Execution & Verification (`razorpay_service.py` & Webhooks)
Handles the creation of Razorpay Test Mode orders. Verifies payments via frontend signatures and robust webhook signature validation to officially mark revenue as recovered.

## Data & Decision Flow

1.  **Ingestion**: A failed payment event is logged as a `RecoveryCase`.
2.  **Diagnosis**: The AI layer analyzes the case and suggests an intervention.
3.  **Validation**: The strategy optimizer selects the best intervention; guardrails approve or reject it.
4.  **Execution**: An authorized recovery action (e.g., checkout retry) is presented to the user/customer.
5.  **Verification**: Razorpay processes the payment and sends a webhook.
6.  **Measurement**: The webhook is verified, the case is marked `RECOVERED`, and statistics are updated.

## The Trust Boundary

The core architectural principle of VORTEX is the trust boundary between AI and execution:
-   **AI may only advise, diagnose, and explain.**
-   **Deterministic code decides, limits, executes, and verifies.** 

The AI cannot directly modify monetary values, bypass retry limits, override a case state, or execute an arbitrary payment action.

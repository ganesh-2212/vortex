# Recovery Orchestration & Adaptive Scheduling (F13)

The **Recovery Orchestration Engine** provides deterministic lifecycle management for revenue recovery cases. It takes the recommendations provided by F11 (Strategy Optimization) and decides *when* and *if* to execute them, based on cooldown periods, retry limits, and current execution state.

## Core Responsibilities

1. **State Evaluation**: Determines if a case should execute immediately, wait for a cooldown, escalate to human review, or stop entirely.
2. **Idempotency**: Prevents duplicate executions by logging decisions strictly to the audit store and skipping evaluations if no state changes occurred.
3. **Safety & Guardrails**: Strictly adheres to the maximum retry limits and cooldown hours specified in the merchant's configuration. It *does not* bypass existing guardrails.
4. **Adaptive Scheduling**: Defers actions when a cooldown is active, calculating the exact time the next execution is allowed.

## Orchestration Decisions

- **EXECUTE_NOW**: The strategy is ready to be executed immediately.
- **WAIT_COOLDOWN**: A retry occurred recently; the orchestrator calculates the remaining cooldown time based on the merchant configuration.
- **ESCALATE_TO_HUMAN**: The case reached the maximum automatic retry limits and requires human intervention.
- **STOP_RECOVERY**: The case has been aborted or stopped (terminal state).
- **ALREADY_RECOVERED**: The funds have already been recovered successfully (terminal state).

## Data Models

- **OrchestrationState**: Describes the full evaluation context, including the decision, reason, expected attempt number, scheduled time, and whether escalation is required.

## API Endpoints

- `POST /api/v1/recovery-cases/{case_id}/orchestration/evaluate`: Runs the evaluation logic, logs an audit entry, and returns the deterministic state.
- `GET /api/v1/recovery-cases/{case_id}/orchestration`: Returns the current state without side effects.

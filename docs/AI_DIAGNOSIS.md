# AI Intelligence Layer

The VORTEX AI Diagnosis module (`ai_diagnosis.py`) is responsible for interpreting raw, often unstructured payment failure context and returning a structured, actionable diagnosis.

## Responsibilities
The AI layer receives:
- Case telemetry (amount, currency)
- Customer information
- Failure event details (e.g., gateway decline codes, webhook payloads)

It produces a structured JSON response containing:
- **Root Cause**: A human-readable explanation of why the payment failed.
- **Evidence**: Specific data points from the payload that support the diagnosis.
- **Risk Explanation**: An assessment of why this failure might be difficult or easy to recover.
- **Recommended Action**: The suggested intervention (e.g., `IMMEDIATE_RETRY`, `DELAYED_RETRY`, `ESCALATE_TO_HUMAN`).
- **Action Reason**: Why this specific action is the best choice.
- **Confidence**: A 0-100 score indicating the AI's certainty in its diagnosis.

## Boundaries and Limitations
The AI is strictly advisory. 
- It **cannot** directly trigger a payment capture.
- It **cannot** overwrite the `amount_at_risk` or `recovered_amount` in the database.
- It **cannot** bypass maximum retry policies.

The `recommended_action` provided by the AI is passed down to the deterministic `recovery_orchestrator.py` and `guardrails.py` modules. If the AI suggests an action that violates safety boundaries (e.g., retrying a card that has already failed 5 times), the deterministic policy layer overrides the AI and blocks the action.

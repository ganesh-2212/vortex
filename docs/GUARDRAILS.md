# Safety & Guardrails

VORTEX operates on the principle that autonomous systems handling financial data must be bounded by deterministic rules.

## Deterministic Execution Controls
While the AI layer (`ai_diagnosis.py`) may recommend any action, the Guardrails module (`guardrails.py`) evaluates the recommendation against hard-coded policy rules before any execution occurs.

### Implemented Policies
VORTEX currently enforces the following safety boundaries:

1.  **Max Attempts (`MAX_ATTEMPTS`)**: A case cannot exceed a predefined number of recovery attempts. Subsequent requests are blocked and the case is stopped.
2.  **Minimum Cooldown (`MIN_RETRY_INTERVAL`)**: To prevent spamming customers or gateways, actions executed too quickly after a previous failure are blocked.
3.  **Maximum Amount (`MAX_AMOUNT`)**: Very large transactions flagged as high-risk may trigger an automatic escalation limit, preventing automated recovery without human review.
4.  **Idempotency / State Protection (`PREVENT_DUPLICATE_RECOVERY`)**: If a case is already in the `RECOVERED` state, guardrails block any further attempts to charge the customer.

## Escalation and Stopping Rules
If an action violates a guardrail:
- The system returns an evaluation array detailing exactly which check failed and why.
- The Orchestrator intercepts the block. If the violation is final (e.g., max attempts reached), the case state transitions to `STOPPED`. 
- If the case is deemed too sensitive (e.g., excessive amount, suspected fraud), it transitions to `ESCALATED`.

This ensures that the AI can never accidentally spin into an infinite retry loop or blindly charge a user against policy.

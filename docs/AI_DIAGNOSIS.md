# AI Intelligence Layer

The VORTEX AI Intelligence Layer is responsible for interpreting payment failure context and producing a structured diagnosis and recovery recommendation.

The implementation is centered around `backend/app/services/ai_diagnosis.py`.

The AI layer is intentionally designed as an **advisory intelligence component**. It can reason about failure context, explain likely causes, and recommend a recovery strategy, but it does not have authority over financial execution or safety policy.

---

## Responsibilities

The AI diagnosis service receives structured recovery-case context, including:

- Payment amount and currency
- Revenue event details
- Failure information and gateway response context
- Customer and case context
- Existing recovery state where relevant

It transforms this context into a structured diagnosis containing:

| Field | Purpose |
|---|---|
| **Root Cause** | Human-readable explanation of the likely reason for the payment failure. |
| **Evidence** | Relevant case or payment data supporting the diagnosis. |
| **Risk Explanation** | Explanation of factors that may make the case easier or harder to recover. |
| **Recommended Action** | Suggested recovery strategy such as `IMMEDIATE_RETRY`, `DELAYED_RETRY`, or `ESCALATE_TO_HUMAN`. |
| **Action Reason** | Explanation of why the recommended intervention is appropriate for the diagnosed situation. |
| **Confidence** | Model-generated confidence score associated with the diagnosis. |

The output is schema-validated before it is consumed by the rest of the recovery workflow.

---

## AI and Deterministic Control Boundary

The important boundary is that **an AI recommendation does not imply authorization**.

For example, if the AI recommends `IMMEDIATE_RETRY`, the deterministic policy layer still evaluates whether that action is permitted for the current case.

If the case has already reached its retry limit, has entered a terminal state, or violates another configured safety condition, the action is rejected regardless of the AI recommendation.

---

## Deterministic Safety Boundary

VORTEX follows the principle:

> **AI recommends. Deterministic policy decides.**

This prevents model output from directly controlling financial execution.

The deterministic recovery layer remains responsible for enforcing constraints such as:

- Maximum retry attempts
- Case lifecycle state
- Allowed recovery actions
- Recovery stopping conditions
- Escalation requirements
- Protection of already-recovered cases

This architecture allows VORTEX to use AI where probabilistic reasoning is valuable while keeping financial execution predictable and bounded.

---

## Fallback Behavior

AI availability is not treated as a prerequisite for the safety layer.

If the configured Gemini model is unavailable, rate-limited, or otherwise unable to produce a valid diagnosis, VORTEX can fall back to deterministic analysis rather than allowing an uncontrolled or incomplete AI response to enter the recovery workflow.

The fallback preserves the same fundamental safety boundary: **financial actions still require deterministic policy validation.**

This also means that an AI outage does not become an authorization path around the recovery guardrails.

---

## Limitations

The AI diagnosis is probabilistic and should therefore be treated as an interpretation of available evidence rather than ground truth.

In particular:

- A diagnosis may be incorrect or incomplete.
- Confidence is not a guarantee of correctness.
- The recommended action is not automatically executable.
- External payment systems remain the source of truth for payment outcomes.
- Verified payment events, rather than AI output, determine whether revenue was actually recovered.

VORTEX intentionally embraces this limitation by placing deterministic policy and external payment verification between AI reasoning and financial outcome.
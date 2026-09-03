# AI Diagnosis

VORTEX uses an AI Diagnosis layer to analyze failed-payment and revenue-event context and produce structured diagnostic intelligence. This intelligence helps the recovery system understand why a payment may have failed and what recovery strategy may be appropriate.

The AI Diagnosis layer is an intelligence mechanism, NOT the financial execution authority. 

### Architecture Flow

Revenue Event
    ↓
Risk Assessment
    ↓
AI Diagnosis
    ↓
Strategy / Decision Intelligence
    ↓
Deterministic Policy & Guardrails
    ↓
Bounded Recovery Action
    ↓
Razorpay Test Mode
    ↓
Payment Verification
    ↓
Confirmed Recovery

---

## Purpose of the AI Diagnosis Layer

Payment failures can have multiple possible causes. While raw payment and revenue events provide structured facts (e.g., error codes, amounts), they may not directly explain the likely failure cause or suggest the best path to recovery. 

AI is highly useful for interpreting this available context and producing a human-readable diagnosis. This diagnosis helps provide reasoning and recovery recommendations to the merchant or system operator. 

However, all AI output is purely advisory. VORTEX distinguishes between:
- **Detecting** a revenue event (deterministic)
- **Assessing** risk (deterministic)
- **Diagnosing** likely cause (probabilistic/AI)
- **Recommending** an action (probabilistic/AI)
- **Authorizing** an action (deterministic)
- **Executing** an action (deterministic)
- **Verifying** the payment (deterministic)
- **Confirming** recovered revenue (deterministic)

---

## AI Responsibility in VORTEX

The AI Diagnosis layer is responsible for interpreting the context surrounding a payment failure. The implementation returns a structured `DiagnosisResult` object containing:

1. **`root_cause_category`**: A high-level categorization of the failure (e.g., INSUFFICIENT_FUNDS, CARD_DECLINED). Useful for filtering and analytics. AI-generated.
2. **`root_cause`**: A detailed, human-readable explanation of why the payment failed. AI-generated.
3. **`evidence`**: A list of data points supporting the diagnosis. AI-generated.
4. **`risk_explanation`**: An explanation of the recovery risk and whether a retry is likely to succeed. AI-generated.
5. **`recommended_action`**: A suggested strategy (e.g., RETRY_PAYMENT, ESCALATE_TO_HUMAN). AI-generated but validated against allowed types.
6. **`action_reason`**: The AI's justification for the recommended action. AI-generated.
7. **`confidence`**: An integer score (0-100) representing the probabilistic confidence of the diagnosis. AI-generated.
8. **`guardrail_status`**: Deterministic check of whether the recommended action violates active guardrails. Derived deterministically by the backend.
9. **`analysis_source`**: Identifies whether the diagnosis came from "gemini" or "Deterministic analysis" fallback. Derived deterministically by the backend.
10. **`diagnosis_version` / `generated_at`**: Metadata timestamps and versioning. Derived deterministically by the backend.

*None of these fields directly execute financial actions. They are read-only intelligence points.*

---

## Diagnosis Input Context

To generate a diagnosis, VORTEX provides the following context to the AI via a structured prompt in `ai_diagnosis.py`:

- **Payment Amount & Currency**: To understand the scale of the transaction.
- **Payment Method**: To identify method-specific restrictions (e.g., cards vs. UPI).
- **Error Reason**: The raw Razorpay error reason or gateway error code.
- **Previous Failure History**: The number of previous failed/executed actions for this specific case to inform whether a retry is still viable.
- **Risk Level**: The pre-assessed deterministic risk level of the case.

These inputs give the AI the factual basis needed to generate an accurate diagnostic assessment. 

---

## Gemini Integration

VORTEX integrates with Google Gemini for AI diagnosis.

- **Client**: `google-genai` SDK (`genai.Client`).
- **Model**: Configured via the `GEMINI_MODEL` environment variable (currently defaulting to `gemini-2.5-flash`).
- **API Key**: Configured via the `GEMINI_API_KEY` environment variable.
- **Request Mechanics**: The diagnosis request is made synchronously within the `generate_diagnosis` function using `client.models.generate_content`. 
- **Response Handling**: The model is prompted to return structured JSON (`response_mime_type="application/json"`). The response text is parsed using `json.loads` and mapped directly onto the `DiagnosisResult` schema.

---

## Diagnosis Request Flow

The end-to-end request flow for obtaining an AI diagnosis is as follows:

Frontend Case Details Component (`CaseDetailExperience.tsx`)
        ↓
Diagnosis API Request (`GET /api/v1/recovery-cases/{caseId}/diagnosis`)
        ↓
Diagnosis Endpoint (`backend/app/api/v1/diagnosis.py`)
        ↓
AI Diagnosis Service (`backend/app/services/ai_diagnosis.py`)
        ↓
Gemini API (`client.models.generate_content`)
        ↓
Structured Diagnosis (`DiagnosisResult`)
        ↓
Frontend Diagnosis Presentation

---

## AI vs Deterministic Control Boundary

VORTEX deliberately separates probabilistic AI reasoning from deterministic financial control. This is a foundational architectural principle.

| Responsibility | AI Layer | Deterministic System |
|---|---|---|
| Interpret payment context | Yes | No |
| Generate likely root cause | Yes | No |
| Explain evidence | Yes | No |
| Recommend recovery action | Yes | No |
| Apply retry limits | No | Yes |
| Evaluate guardrails | No | Yes |
| Authorize execution | No | Yes |
| Execute bounded recovery | No | Yes |
| Calculate financial outcomes | No | Yes |
| Verify Razorpay payment evidence | No | Yes |
| Confirm recovered revenue | No | Yes |

> **AI recommends. Deterministic policy decides.**

This architecture ensures that AI hallucinations or API instability cannot cause uncontrolled financial actions or infinite retry loops.

---

## Deterministic Safety Boundary

After the AI generates its recommendation, VORTEX applies a strict deterministic safety boundary before any action can be executed.

AI Diagnosis
    ↓
Recommendation
    ↓
Deterministic Policy Evaluation
    ↓
Guardrails
    ↓
Allowed / Blocked / Escalated
    ↓
Bounded Execution

The AI cannot bypass recovery limits, case-state restrictions, guardrails, or payment verification requirements. If the AI recommends an action that violates a guardrail, the deterministic system intercepts it and updates the `guardrail_status` to "BLOCKED BY GUARDRAIL".

---

## AI Recommendation Does Not Imply Authorization

A diagnosis or recommendation is not an authorization to execute a financial action.

**AI Recommendation ≠ Execution Authorization**

The recommendation must pass through deterministic policy and guardrail evaluation before an executable recovery action can proceed. The AI's `recommended_action` is purely an advisory string.

---

## Structured Output and Validation

The AI is explicitly prompted to return a JSON object matching a strict schema. VORTEX uses `json.loads` to parse the raw text output.

Additionally, VORTEX performs a safety validation check on the recommended action:
- It checks the `action` against a list of supported executable actions (`RETRY_PAYMENT`, `SEND_REMINDER`, `OFFER_ALTERNATIVE_METHOD`, `ESCALATE_TO_HUMAN`, `STOP_RECOVERY`).
- If the AI recommends an invalid action (or a deprecated action like `SEND_PAYMENT_LINK`), the code rejects the AI's output and executes the deterministic fallback routine instead.

---

## Fallback Behavior

VORTEX must remain usable even if the external AI service is unavailable. 

If the Gemini API cannot be reached, throws an exception (e.g., a rate limit error), returns an invalid JSON response, or recommends an invalid action, VORTEX seamlessly executes a `_deterministic_fallback` routine.

The fallback routine uses a hardcoded rule engine based on the `error_reason` to supply a baseline diagnosis and recommendation. 

Crucially, when the fallback is invoked, VORTEX sets the `analysis_source` field to `"Deterministic analysis"` (as opposed to `"gemini"`). This allows the frontend to explicitly label where the diagnosis came from, ensuring operator transparency.

---

## AI Availability and Rate Limits

Gemini availability depends on the configured API service and quota (such as the Free Tier limits). 

Because the AI service can become rate-limited or unavailable, AI diagnosis is not treated as an authoritative financial system of record. If the API is rate-limited (e.g., returning HTTP 429), VORTEX gracefully handles the exception and defaults to the deterministic fallback behavior to preserve system availability.

---

## Confidence and Uncertainty

The `confidence` score (0-100) returned in the diagnosis represents the AI's probabilistic assessment of its own reasoning. When generated by the deterministic fallback, confidence is hardcoded based on the specificity of the error mapping.

The confidence score is **NOT**:
- A guarantee of the root cause.
- A guarantee that a payment will succeed.
- A guarantee of recovered revenue.
- Authorization to execute a recovery action.

---

## Diagnosis and Decision Intelligence

AI Diagnosis relates to, but is distinct from, Decision Intelligence.

- **AI Diagnosis:** "Why might this payment have failed and what recovery action appears appropriate?" (Advisory)
- **Decision Intelligence / Strategy Optimizer:** "Which recovery strategy yields the best historical financial performance for this scenario?" (Optimization)
- **Deterministic Policy:** "Is the selected action legally and financially allowed?" (Control)
- **Execution:** "Perform only the bounded action." (Action)
- **Verification:** "Did the payment succeed?" (Source of truth)

---

## Diagnosis and Recovery Lifecycle

Detect
  ↓
**Diagnose (AI & Fallback)**
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

The AI primarily contributes to the **Diagnose** stage. Downstream deterministic systems heavily control execution, verification, and measurement.

---

## Failure Handling

VORTEX handles AI failures securely:
- **Missing API Key**: Immediately defaults to deterministic fallback.
- **API Request Failure / Timeout / Rate Limit**: The exception is caught, and the deterministic fallback is invoked.
- **Invalid AI Response / JSON Parse Failure**: The exception is caught, and the deterministic fallback is invoked.
- **Unsupported Action Recommended**: The AI output is discarded, and the deterministic fallback is invoked.

---

## Auditability

AI diagnoses are logged for traceability. When a diagnosis is generated, VORTEX records an `AI_DIAGNOSIS_GENERATED` audit event detailing the assigned category, confidence, and analysis source. This ensures that the recovery decision is fully traceable from the initial event through to the final confirmed recovery.

---

## Security Considerations

- **Secret Management**: API keys remain strictly backend-side and are never exposed to the frontend.
- **Zero Trust Execution**: AI output is never trusted as an execution command.
- **Guardrail Supremacy**: AI-generated recommendations cannot override deterministic guardrails.
- **External Verification**: All financial outcomes are independently verified by the Razorpay webhook/polling integrations.

---

## Limitations

- **Probabilistic Output**: AI output is probabilistic and diagnosis reasoning may be incorrect.
- **Availability**: External AI availability is not guaranteed.
- **No Guarantees**: AI recommendations do not guarantee payment success or recovery.
- **Verification Requirement**: Recovery is not considered successful until appropriate payment evidence is received from Razorpay.
- **No Autonomous Retraining**: The VORTEX strategy learning loop relies on historical recovery evidence and statistical optimization; it does not autonomously retrain the underlying Gemini LLM.

---

## Why This Architecture Matters

VORTEX does not allow the AI layer to directly control financial execution due to the fundamental differences in capabilities.

**AI is strong at:**
- Interpreting unstructured or contextual information.
- Explaining likely causes in human terms.
- Producing recovery recommendations.

**Deterministic systems are strong at:**
- Enforcing limits and rules.
- Controlling financial execution safely.
- Preventing duplicate or excessive actions.
- Providing predictable safety behavior.

**External payment events are the source of truth for:**
- Payment completion and verification.

> VORTEX uses AI for intelligence, deterministic systems for control, and verified payment events for truth.

---

## Implementation References

| Component | Purpose |
|---|---|
| `backend/app/services/ai_diagnosis.py` | AI diagnosis and deterministic fallback logic |
| `backend/app/api/v1/diagnosis.py` | Diagnosis API endpoint routing |
| `backend/app/models/diagnosis.py` | `DiagnosisResult` schema definition |
| `frontend/src/components/cases/CaseDetailExperience.tsx` | Displays AI diagnosis and analysis source to the operator |

---

## Documentation References

- [Architecture Overview](ARCHITECTURE.md)
- [Guardrails](GUARDRAILS.md)
- [Recovery Engine](RECOVERY_ENGINE.md)
- [Razorpay Integration](RAZORPAY_INTEGRATION.md)
- [Webhook Verification](WEBHOOK_VERIFICATION.md)
- [Strategy Learning](STRATEGY_LEARNING.md)
- [Demo Runbook](DEMO_RUNBOOK.md)
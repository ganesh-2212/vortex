# Buildathon Review

VORTEX was built for the Razorpay Buildathon Track 03: AI Revenue Recovery.

VORTEX is an AI-assisted revenue recovery control plane that operates on the following lifecycle:

Detects revenue risk
→ Diagnoses the likely cause
→ Recommends a recovery strategy
→ Applies deterministic safety policies
→ Executes a bounded recovery action
→ Verifies the external payment outcome
→ Measures recovered revenue
→ Uses verified outcomes as historical strategy evidence

> AI provides intelligence. Deterministic systems provide control. Verified payment events provide outcome evidence.

---

## 1. Track 03 Alignment

The core Track 03 requirement is to build an agent that detects revenue at risk, determines an appropriate intervention, executes a bounded recovery workflow, and demonstrates measured recovery outcomes with safety controls and auditability.

VORTEX explicitly implements these capabilities:

| Track 03 Requirement | VORTEX Implementation |
|---|---|
| Detect revenue at risk | Revenue event ingestion and deterministic risk assessment |
| Determine intervention | Gemini AI diagnosis and Strategy Optimizer intelligence |
| Execute bounded recovery | Deterministic policy and guardrails control executable actions |
| Verify outcome | Razorpay Test Mode checkout, verification, and `payment.captured` webhooks |
| Measure recovered revenue | Recovery state transitions and revenue evaluation metrics |
| Apply stopping rules | Deterministic retry limits and case-state controls (e.g., stopping active cases) |
| Auditability | Persistent case audit timelines mapping diagnosis to action to recovery |
| Learn from outcomes | Strategy selection powered by historical recovery performance data |

---

## 2. Problem

Payment failures create revenue leakage. However, blindly retrying failed payments creates:
- Repeated failed attempts
- Unnecessary customer friction
- Gateway and payment network spam
- Increased operational action costs
- Unsafe automated behavior

Merchants need a recovery system that strategically balances revenue opportunity with recovery likelihood, operational cost, and safety constraints.

---

## 3. VORTEX Solution

VORTEX addresses the problem through a structured lifecycle:

- **Detect**: Identifies a failed revenue event and assesses baseline risk.
- **Diagnose**: Uses Gemini AI to diagnose the likely cause of failure (or falls back deterministically).
- **Decide**: Uses Decision Intelligence to identify the highest-performing recovery strategy.
- **Guard**: Evaluates the action against strict deterministic safety policies and retry limits.
- **Recover**: Executes the authorized, bounded recovery action (e.g., Razorpay payment link).
- **Verify**: Verifies the outcome using the Razorpay API and webhooks.
- **Measure**: Measures the confirmed recovered revenue upon success.
- **Learn**: Feeds the verified outcome back into the historical strategy performance data.

---

## 4. AI + Deterministic Control

VORTEX maintains a strict separation between probabilistic AI and deterministic financial execution.

| AI Layer | Deterministic Layer |
|---|---|
| Diagnoses likely payment failure cause | Enforces recovery policies |
| Produces supporting reasoning | Applies retry limits |
| Recommends recovery action | Controls action authorization |
| Provides confidence | Protects case state |
| Helps decision intelligence | Controls financial execution |

> AI recommendations are advisory and do not constitute authorization to execute a financial action.

Deterministic policy and guardrails always form the final execution boundary.

---

## 5. Bounded Recovery

VORTEX prevents uncontrolled behavior by requiring all actions to pass deterministic checks before execution. Mechanisms include:
- Maximum retry limits per action type
- Case-state protection (preventing actions on closed cases)
- Explicit guardrail evaluation (e.g., cooldowns, blocks)
- Clear stopping rules (e.g., escalating to a human)

An AI recommendation that violates a guardrail is explicitly blocked by the system and an audit event is recorded.

---

## 6. Razorpay Test Mode Proof

VORTEX integrates a genuine Razorpay payment flow using Test Mode credentials.

Recovery Action
→ Razorpay Order
→ Razorpay Test Mode Checkout
→ Payment
→ Payment Verification
→ `payment.captured` webhook
→ Confirmed Recovery

The system has been end-to-end verified with real network callbacks and Razorpay signature verification.

> The demonstration uses Razorpay Test Mode and does not involve real-money transactions.

---

## 7. Verified Recovery Evidence

VORTEX distinguishes between AI recommendations and verified recovery.

```text
AI Recommendation
        ≠
Recovery Authorization
        ≠
Payment Execution
        ≠
Verified Recovery
```

A case is only marked as `RECOVERED` when an authoritative payment evidence (such as a valid Razorpay webhook or manual backend verification of the payment status) is confirmed. AI cannot simply declare a case as recovered.

---

## 8. Strategy Learning

VORTEX includes a Decision Intelligence layer that segments historical recovery outcomes by event type and previous failure reason. Over time, the Strategy Optimizer relies on verified payment evidence to determine the statistically optimal recovery path, avoiding reliance on blind AI guessing.

---

## 9. Current Limitations

- **Probabilistic AI**: The Gemini AI diagnosis is probabilistic and acts only as an advisory signal.
- **Test Mode Only**: The system processes simulated revenue events and uses Razorpay Test Mode. Simulated recovered revenue is not real revenue.
- **No Autonomous Retraining**: The VORTEX strategy learning loop relies on statistical performance data; it does not autonomously retrain the underlying Gemini LLM.
- **API Limits**: External Gemini diagnosis depends on API availability and free-tier quotas. VORTEX gracefully falls back to deterministic logic if rate-limited.

---

## 10. References

For deeper technical detail on the implementation, see:
- [AI Diagnosis Architecture](AI_DIAGNOSIS.md)
- [Guardrails & Safety Boundaries](GUARDRAILS.md)
- [Recovery Engine](RECOVERY_ENGINE.md)
- [Razorpay Integration](RAZORPAY_INTEGRATION.md)
- [Webhook Verification](WEBHOOK_VERIFICATION.md)
- [Strategy Learning](STRATEGY_LEARNING.md)
- [AI Development Rules](AI_DEVELOPMENT_RULES.md)
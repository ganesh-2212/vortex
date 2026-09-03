# AI Development Rules

VORTEX was developed with AI coding assistants under explicit engineering, security, testing, and financial-safety constraints. AI assistants were used as powerful development tools, while architectural decisions, validation, testing, and final acceptance remained strictly controlled by the developer workflow.

> AI assists development. Engineering validation controls acceptance.

---

## 1. Scope-Controlled Development

AI coding assistants must work only on the requested feature, bug fix, documentation task, or milestone.

- Understand the requested scope before modifying files.
- Inspect existing implementation before making changes.
- Avoid unrelated refactoring.
- Avoid unnecessary dependencies or UI redesigns.
- Do not introduce speculative features.
- Do not modify unrelated working functionality.

---

## 2. Inspect Before Modify

Existing code, architecture, APIs, and related modules must be inspected before changes are proposed. AI-generated assumptions must never replace actual repository inspection. The development process requires identifying:

- Existing implementation and data flow
- Related components/services and API contracts
- Existing tests, configuration, and dependencies
- Potential impact of the change

---

## 3. Preserve Existing Contracts

Existing application contracts should be preserved unless a requested change explicitly requires modification. Unnecessary breakage must be avoided across:

- API routes and Request/response structures
- Domain models and state transitions
- Frontend/backend integration boundaries
- External integration behavior

---

## 4. Financial Safety Boundary

Because VORTEX handles revenue recovery, financial actions must not depend solely on AI-generated output.

> AI recommends. Deterministic policy decides.

- AI may diagnose payment failures and provide recommendations.
- AI **does not** directly authorize financial execution.
- Deterministic policy and guardrails control executable actions.
- Financial calculations and recovery limits remain deterministic.
- External payment evidence determines confirmed recovery.

---

## 5. AI Output Is Not Trusted Execution

AI-generated content is treated as probabilistic information. Output from AI must be structured, parsed, and validated before being utilized by downstream application logic. AI output must **not** be treated as:

- An execution command
- Financial authorization
- Proof of payment or recovered revenue
- A replacement for deterministic policy

---

## 6. Secrets and Security

Basic security rules must be rigorously followed during AI-assisted development:

- Never place API keys in source code.
- Never expose backend secrets through frontend code.
- Never commit `.env` files.
- Never paste real credentials into prompts or source files.
- Use Test Mode credentials for Razorpay development.
- Keep webhook secrets server-side.
- Review AI-generated code for accidental secret exposure.

---

## 7. External Integrations

AI-generated code involving external systems must be verified against the actual project integration. For VORTEX, this includes Razorpay (Checkout, Test Mode, Webhooks) and the Gemini API. 

AI assistants must not invent API behavior, endpoints, webhook events, credentials, or SDK methods. Existing integration behavior should be strictly inspected before modifying it.

---

## 8. Testing Before Acceptance

AI-generated code is not considered complete merely because it compiles or appears correct. Final acceptance in VORTEX requires validation through the backend test suite (47+ tests) and frontend production builds. Before accepting a change:

1. Run relevant automated tests (e.g., `pytest`).
2. Run the frontend build when frontend code is affected (`npm run build`).
3. Check for TypeScript or Python errors.
4. Review the Git diff.
5. Confirm unrelated files were not changed.
6. Verify the requested behavior.
7. Confirm no secrets were introduced.

---

## 9. Regression Protection

Existing functionality must remain working after each change. Regression checks must ensure that core capabilities are uncompromised, including:

- Recovery workflow and Guardrails
- Razorpay integration and Webhook verification
- AI diagnosis and Strategy logic
- Simulation
- Frontend navigation and API communication

---

## 10. Minimal Change Principle

Changes should be as small as reasonably possible. Prefer targeted fixes utilizing existing components, services, patterns, and API contracts. Avoid unnecessary rewrites, large unrelated refactors, duplicate implementations, or new abstractions/dependencies without explicit justification.

---

## 11. Documentation Accuracy

Documentation must describe the **current implementation** rather than planned or hypothetical functionality. Documentation must clearly distinguish between implemented functionality, Test Mode behavior, simulation behavior, and project limitations. 

Documentation must **not** claim:
- Real-money payment processing
- Autonomous financial decision-making or model retraining
- Verified revenue from simulation projections
- Features or security guarantees that do not exist

---

## 12. Git and Change Traceability

Meaningful development changes should be easily traceable through Git. This includes using focused commits, reviewing changes before committing, avoiding committing unrelated files, and keeping the main branch in a validated state without committing secrets.

---

## 13. Human Review

AI-generated implementation requires developer review before acceptance. The AI assistant may propose or implement changes, but final acceptance depends on validating correctness, scope, security, architecture, API compatibility, financial safety, test coverage, and documentation accuracy.

---

## 14. VORTEX Development Control Model

```text
Requirement
    ↓
Repository Inspection
    ↓
AI-Assisted Implementation
    ↓
Developer Review
    ↓
Automated Validation
    ↓
Regression Check
    ↓
Git Diff Review
    ↓
Commit / Integration
```
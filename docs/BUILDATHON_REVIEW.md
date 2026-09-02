# Evaluator Technical Review

**Project:** VORTEX
**Track:** Track 03 - AI Revenue Recovery (Razorpay AI Buildathon)

## Overview
VORTEX addresses the core challenge of revenue recovery: attempting to automatically salvage failed payments without violating merchant safety policies, annoying customers, or assuming success blindly.

Instead of treating revenue recovery as a purely probabilistic AI task, VORTEX treats it as a governed decision lifecycle. The system proves that AI is incredibly powerful at unstructured diagnosis, while deterministic code remains strictly necessary for safe execution.

## Key Buildathon Alignment

1.  **AI Diagnosis**: VORTEX successfully parses failure contexts to determine root causes and recommends actions. The AI layer is strictly advisory.
2.  **Deterministic Decisioning**: Executable actions are evaluated by deterministic policy. VORTEX enforces max attempts, cooldowns, and idempotency using a structured guardrail system.
3.  **Bounded Recovery**: Interventions operate inside explicit state boundaries. A case cannot be recovered twice, nor can an escalated case be automatically retried.
4.  **Verified Outcomes**: VORTEX does not fabricate recovery numbers. A genuine Razorpay Test Mode integration is implemented. Cases transition to `RECOVERED` exclusively upon cryptographically verified `payment.captured` webhooks.
5.  **Learning Loop**: Historical strategy performance is tracked and segmented by event type, enabling the system to mathematically favor strategies proven to work in the real world.
6.  **Simulation vs Reality**: The architecture deeply separates synthetic batch evaluations (Recovery Simulation) from authoritative telemetry (Merchant Command Center).

## Current Limitations

Evaluators should note the following scope limitations for this buildathon submission:
- **In-Memory State**: To simplify demonstration and deployment, the database layer relies on an in-memory `MemoryStore`. Data does not persist across backend restarts.
- **Authentication**: Multi-tenant authorization is not implemented for this proof-of-concept.
- **Single Payment Provider**: The implementation focuses entirely on Razorpay Test Mode.

## Conclusion
VORTEX provides a complete, auditable, and safe control plane for revenue recovery, successfully marrying the flexibility of AI diagnosis with the absolute reliability of deterministic financial execution.

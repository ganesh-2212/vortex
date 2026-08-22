# Revenue Sentinel

## Product

Revenue Sentinel is an AI-powered revenue recovery platform designed for payment businesses and merchants.

It detects revenue at risk, investigates probable causes, determines safe recovery opportunities, recommends bounded interventions, executes approved interventions in a controlled environment, measures outcomes, and maintains a complete audit trail.

---

# Problem

Revenue leakage rarely happens as one obvious event.

Examples:

- payment failures
- checkout abandonment
- payment-method degradation
- subscription payment failures
- delayed receivables
- repeated failed retries
- merchant-specific payment degradation

Traditional systems often identify failures but do not close the loop from:

Detection → Diagnosis → Decision → Intervention → Measurement.

Revenue Sentinel aims to close that loop.

---

# Core Pipeline

Payment Events
↓
Event Ingestion
↓
Event Normalization
↓
Revenue Intelligence
↓
Baseline Detection
↓
Anomaly Detection
↓
Incident Creation
↓
AI Investigation
↓
Root Cause Analysis
↓
Revenue at Risk
↓
Intervention Recommendation
↓
Policy Engine
↓
Bounded Execution
↓
Monitoring
↓
Stop / Rollback
↓
Recovery Measurement
↓
Audit Trail

---

# Core Principles

1. AI recommends; deterministic systems enforce.
2. Financial calculations are deterministic.
3. AI output must be schema validated.
4. No intervention can bypass the policy engine.
5. Every intervention must have limits.
6. Every action must be auditable.
7. Recovery must be measurable.
8. Failed interventions must stop or rollback.
9. Replay scenarios must use the same processing pipeline.
10. The prototype must never perform uncontrolled real-money actions.

---

# Primary Users

## Merchant

Needs:

- visibility into revenue leakage
- explanation of why revenue is at risk
- recommended recovery actions
- expected recovery amount
- intervention status
- recovery results
- audit history

## Payment Platform

Needs:

- aggregate payment health
- payment degradation detection
- merchant impact analysis
- recovery effectiveness
- intervention safety
- system-wide insights

---

# AI Responsibilities

Gemini may be used for:

- incident investigation
- root-cause hypothesis generation
- evidence interpretation
- intervention recommendation
- merchant-friendly explanations

Gemini must NOT directly:

- calculate authoritative monetary values
- bypass policies
- authorize financial actions
- modify financial records
- execute unrestricted interventions

---

# Deterministic Responsibilities

Application code must handle:

- monetary calculations
- thresholds
- anomaly scores
- policy checks
- intervention limits
- stopping conditions
- rollback
- audit logging
- idempotency
- event processing

---

# Main Product Areas

1. Revenue Overview
2. Revenue Health
3. Active Incidents
4. Incident Investigation
5. Revenue at Risk
6. Recovery Opportunities
7. Intervention Planner
8. Policy Center
9. Intervention Monitoring
10. Audit Trail
11. Replay Lab
12. Evaluation

---

# Build Milestones

F01 Repository and project foundation
F02 Architecture and configuration
F03 Database foundation
F04 Authentication and merchant context

F05 Razorpay webhook ingestion
F06 Webhook signature validation
F07 Idempotency
F08 Event normalization
F09 Payment persistence

F10 Revenue metrics
F11 Historical baseline
F12 Segmentation
F13 Anomaly detection
F14 Revenue-at-risk calculation

F15 Incident management
F16 Evidence aggregation
F17 Gemini investigator
F18 Root-cause ranking
F19 AI confidence model

F20 Intervention recommendations
F21 Intervention risk scoring
F22 Merchant policy engine
F23 Approval workflow
F24 Controlled intervention executor

F25 Intervention monitoring
F26 Stop conditions
F27 Rollback
F28 Recovery measurement
F29 Audit trail

F30 Synthetic transaction generator
F31 Replay engine
F32 Killer scenario
F33 Evaluation engine

F34 Merchant dashboard
F35 Final integration and hardening
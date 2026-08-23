# Revenue Recovery Domain Architecture

This document details the deterministic domain foundation of the Revenue Sentinel recovery engine.

---

## Core Principles

> [!IMPORTANT]
> **AI recommends. Deterministic systems enforce.**
>
> All financial calculations, risk boundaries, attempt policies, and cooldown intervals are governed by transparent, rule-based code. AI models (like Gemini) may analyze payment contexts to propose recommendations, but all proposals are strictly validated by deterministic guardrails before being allowed or audited.

---

## Domain Model Entities

### 1. Revenue Event
Standardized transaction records representing processor-specific event data normalized into a unified schema:
- **Event Types:** `PAYMENT_FAILED`, `PAYMENT_SUCCESS`, `CHECKOUT_ABANDONED`, `SUBSCRIPTION_FAILED`, `INVOICE_OVERDUE`, `PAYMENT_RETRY`, `REFUND`.
- **Triggers:** Failure event types (e.g., `PAYMENT_FAILED`) automatically initialize a **Recovery Case**. A `PAYMENT_SUCCESS` event automatically transitions relevant cases to `RECOVERED`.

### 2. Recovery Case
Active recovery processes tracking revenue at risk for a merchant-customer pair:
- **Status States:** `OPEN`, `IN_PROGRESS`, `RECOVERED`, `STOPPED`, `ESCALATED`.
- **Risk Level:** Assigned at creation based on signals assessed by the Risk Engine.

### 3. Recovery Action
Proposed recovery operations evaluated by the guardrail system:
- **Action Types:** `RETRY_PAYMENT`, `SEND_PAYMENT_LINK`, `SEND_REMINDER`, `OFFER_ALTERNATIVE_METHOD`, `ESCALATE_TO_HUMAN`, `STOP_RECOVERY`.
- **Action Status:** Evaluated states: `ALLOWED` / `PROPOSED` or `BLOCKED`.
- **Decision vs Execution Separation:** The evaluation step does *not* execute transactions or contact providers. Allowed actions are marked `ALLOWED` or `PROPOSED`. They are only transitioned to `EXECUTED` by a future execution layer when actual result responses are received.

### 4. Audit Trail
Immutable ledger logs capturing all system operations and action evaluations:
- Logs capture: `CASE_CREATED`, `CASE_RECOVERED`, `ACTION_PROPOSED`, `ACTION_ALLOWED`, `ACTION_BLOCKED`.
- Audit logs guarantee clean differentiation between a proposed action and its guardrail verdict.

---

## Risk Engine

The Risk Engine assesses the severity of a recovery incident using structured, explainable signals.

### Evaluated Signals
The engine processes a dictionary of signals:
- `amount`: Decimal value of the failed transaction.
- `failure_count`: Total previous failures for the customer.
- `event_type`: Type of event (e.g. `INVOICE_OVERDUE`).
- `overdue_status`: Boolean indicator of invoice age.
- `retry_count`: Previous retry attempts.

### Risk Level Rules
- **CRITICAL**:
  - Failed amount >= 50,000 INR
  - `INVOICE_OVERDUE` + amount >= 10,000 INR
- **HIGH**:
  - Failed amount >= 10,000 INR
  - Customer failure count >= 2
- **MEDIUM**:
  - Customer failure count == 1 (secondary failure)
  - Default fallback
- **LOW**:
  - Failed amount < 100 INR + first failure (failure count == 0)

---

## Guardrails

Guardrails validate proposed actions and enforce policy limits.

### 1. Case Status Rules
- **RECOVERED Case:** No actions are allowed.
- **STOPPED Case:** Only `STOP_RECOVERY` or `ESCALATE_TO_HUMAN` are allowed.

### 2. Retry Attempt Rules
- **Attempt Limit:** A maximum of 3 `RETRY_PAYMENT` actions are allowed per recovery case.
- **Retry Cooldown:** A minimum of **24-hour cooldown** is enforced between retry attempts. If the last allowed retry attempt occurred less than 24 hours ago, subsequent retries are blocked.

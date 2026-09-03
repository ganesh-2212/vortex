# VORTEX Razorpay Integration

VORTEX uses Razorpay Test Mode as the external payment execution and verification layer for its revenue recovery workflow. 

This integration demonstrates a genuine API and webhook payment flow using Test Mode credentials. **It does not perform real-money transactions.**

## 1. Integration Overview

Razorpay serves as the bounded execution boundary for VORTEX's recovery lifecycle:

Failed Payment
→ Recovery Decision
→ Guardrail Validation
→ Razorpay Order
→ Checkout
→ Payment
→ Verification/Webhook
→ Recovery Confirmation
→ Revenue Measurement

## 2. Razorpay Test Mode

- VORTEX uses Razorpay Test Mode exclusively for development and demonstration.
- No real-money transaction is performed.
- A successful Test Mode payment transitions a recovery case to a verified `RECOVERED` state only when the implemented verification mechanisms (webhooks/polling) confirm the outcome.

## 3. Configuration

VORTEX configures the Razorpay integration using the following environment variables (defined in `backend/app/config.py`):

- `PAYMENT_PROVIDER_MODE`: Must be set to `razorpay` for live Test Mode integration (defaulting to `mock` otherwise).
- `RAZORPAY_KEY_ID`: The Razorpay Test Mode Key ID (e.g., `rzp_test_...`).
- `RAZORPAY_KEY_SECRET`: The Razorpay Test Mode Key Secret.
- `RAZORPAY_WEBHOOK_SECRET`: The webhook secret used for HMAC SHA256 signature verification.

*Security Note: These are server-side secrets that must be defined in the `.env` file and never committed to Git.*

## 4. Recovery-to-Razorpay Flow

The end-to-end implemented flow is as follows:

1. A recovery case (`RecoveryCase`) is evaluated for a failed payment.
2. A recovery action (e.g., `RETRY_PAYMENT`) is requested.
3. Deterministic guardrails validate the action (e.g., checking retry limits).
4. If allowed, VORTEX calls `razorpay_service.create_order` via the `/api/v1/recovery-cases/{case_id}/actions/execute` endpoint.
5. The frontend launches the Razorpay Checkout modal using the returned order ID and Key ID.
6. The user completes the Test Mode payment in the UI.
7. Payment information is sent to the `/api/v1/recovery-cases/{case_id}/actions/verify-payment` endpoint or received asynchronously via the `/api/v1/webhooks/razorpay` webhook.
8. The corresponding recovery action status is updated to `EXECUTED` and the case status transitions to `RECOVERED`.
9. The verified recovery contributes to the Decision Intelligence strategy performance metrics.

## 5. Order Creation

When an allowed recovery action executes, the backend generates a Razorpay Order:
- Amount and currency are pulled from the `amount_at_risk` of the original `RevenueEvent`.
- The newly generated Razorpay Order ID is stored in memory (`store.razorpay_orders`) alongside the `case_id` and `action_id`.
- This strict mapping prevents arbitrary or tampered frontend orders from bypassing the recovery control flow or artificially marking a case as recovered.

## 6. Razorpay Checkout

The frontend integration relies on the standard Razorpay Checkout SDK script (`checkout.js`).
- Checkout is launched *only* after the requested recovery action passes backend guardrail validation.
- The backend explicitly provides the safe `razorpay_order_id` and public `key_id` to the frontend.
- The user interacts with the standard Razorpay UI to complete a simulated Test Mode payment (e.g., Netbanking success).

## 7. Payment Verification

VORTEX distinguishes between a payment being *initiated*, *completed* on the client, and *verified* by the server. A case is only confirmed as recovered upon server-side verification.

VORTEX implements verification via the `/api/v1/recovery-cases/{case_id}/actions/verify-payment` endpoint:
1. The frontend submits the `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
2. The backend verifies the HMAC SHA256 signature using `razorpay_service.verify_payment_signature`.
3. The backend fetches the payment directly from Razorpay (`razorpay_service.fetch_payment`) to guarantee the status is genuinely `"captured"`.

## 8. Webhook Integration

VORTEX securely listens for asynchronous payment events via the **`/api/v1/webhooks/razorpay`** endpoint.

- **Supported Events**: Handles `payment.captured` and `payment.failed`.
- **Signature Verification**: Validates the `x-razorpay-signature` header against the `RAZORPAY_WEBHOOK_SECRET` before processing.
- **State Updates**: Maps the incoming payment ID to the stored order. If matched, it calls `confirm_payment_recovery` to finalize the action as `EXECUTED` and the case as `RECOVERED`.

*Webhooks act as the ultimate source of truth, providing cryptographic evidence to confirm recovery.*

## 9. Recovery State and Revenue Evidence

A successfully verified Razorpay payment affects the system deterministically:
- **Recovery Action**: Status updates to `EXECUTED` with a result payload containing the `payment_id` and `order_id`.
- **Case Status**: Transitions definitively to `RECOVERED`.
- **Audit History**: Generates a `CASE_RECOVERED` audit event attributing the exact `amount` and `transaction_id`.
- **Recovery Metrics**: The recovered amount is aggregated into the Command Center telemetry and Strategy Optimizer historical performance metrics.

*Merely opening Checkout or creating an order does not generate recovered revenue metrics.*

## 10. Security and Safety Boundary

- Razorpay credentials are kept strictly server-side.
- AI (Gemini) does **not** directly control Razorpay API calls or authorize order creation.
- All recovery actions must pass deterministic guardrails before a Razorpay order can be created.
- Payment evidence comes directly from Razorpay (webhooks/API), not the frontend client.

## 11. Failure and Edge Cases

VORTEX handles several integration edge cases:
- **Missing Configuration**: If keys are missing, the backend throws a 500 error ("Razorpay is not configured").
- **Signature Failure**: Invalid webhook or frontend signatures result in a 400 error and a `WEBHOOK_FAILED` audit log.
- **Uncaptured Payments**: If verification occurs but the payment state is not `"captured"`, the backend safely rejects the verification attempt.
- **Duplicate Events**: The webhook processor checks for existing events matching the `razorpay_payment_id` to prevent double-counting revenue (`WEBHOOK_DUPLICATE` audit log).

## 12. Demo Verification

To verify the integration as an evaluator:
1. Open an `ACTIVE` recovery case from the Command Center.
2. Confirm the recommended recovery action (e.g., Retry Payment).
3. Click to execute the action, ensuring guardrails allow it.
4. Complete the Razorpay Test Mode checkout using simulated credentials.
5. Watch the UI automatically poll the `/verify-payment` endpoint or wait for the webhook.
6. Confirm the case transitions to `RECOVERED` only after successful verification.
7. Scroll to the Case Audit Timeline to view the `RAZORPAY_ORDER_CREATED` and `CASE_RECOVERED` events.

## 13. Scope and Limitations

- **Test Mode Only**: The integration relies entirely on Razorpay Test Mode.
- **No Production Payments**: It is not authorized or designed for real-money processing.
- **Volatile State**: The current implementation stores cases, orders, and events in an in-memory datastore (`store.py`). Data resets on server restart.
- **Advisory AI**: AI diagnosis provides intelligence but does not authorize the Razorpay order creation or confirm the recovery result.

## 14. Related Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Guardrails & Safety Boundaries](GUARDRAILS.md)
- [AI Diagnosis Architecture](AI_DIAGNOSIS.md)
- [Recovery Engine](RECOVERY_ENGINE.md)
- [Webhook Verification](WEBHOOK_VERIFICATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Demo Runbook](DEMO_RUNBOOK.md)

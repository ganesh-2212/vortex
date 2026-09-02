# Webhook Security & Verification

To establish a verified recovery metric, VORTEX relies on cryptographically signed webhooks from Razorpay.

## Event Handling
The system exposes a secure endpoint at `/api/webhooks/razorpay`. When a recovery action is executed through the Razorpay Test Mode checkout, Razorpay issues asynchronous webhook events. VORTEX primarily listens for `payment.captured` and `payment.failed`.

## Signature Verification
Every incoming payload is validated against the `RAZORPAY_WEBHOOK_SECRET`. The backend computes the HMAC SHA256 hex digest of the payload body and compares it against the `x-razorpay-signature` header. If the signature does not match or is missing, the request is rejected as unauthorized.

## Recovery Finalization
1.  **Idempotency**: The webhook handler checks if the case is already marked as `RECOVERED`. If so, it safely ignores duplicate events to prevent double-counting revenue.
2.  **Order Matching**: The payload's embedded `order_id` is matched against the specific `RecoveryCase`.
3.  **State Mutation**: Upon valid `payment.captured` confirmation, the system deterministically updates the case status to `RECOVERED`, moves the `amount_at_risk` to `recovered_amount`, logs the success in the audit trail, and feeds the outcome back into the strategy performance statistics.

This ensures that the "Recovered Revenue" metric displayed in the Command Center is strictly backed by actual gateway verification, not by AI assumptions.

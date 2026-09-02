# Razorpay Test Mode Integration

VORTEX implements a genuine checkout and recovery verification flow using Razorpay's Test Mode. This demonstrates how bounded interventions connect to actual payment gateways.

## Integration Flow

1.  **Order Creation**: When a recovery action is authorized by the Guardrails, VORTEX calls `createPaymentOrder` in `razorpay_service.py`. This securely communicates with the Razorpay API to generate a unique `order_id` associated with the exact `amount_at_risk` of the case.
2.  **Checkout Modal**: The frontend SDK launches the Razorpay Checkout modal using the generated `order_id` and the customer's prefilled details.
3.  **Customer Interaction**: The customer (or evaluator, during the demo) completes the payment using Razorpay Test Mode credentials (e.g., a test card).
4.  **Client-Side Verification**: Upon successful checkout, the frontend receives a `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5.  **Server-Side Verification**: The frontend immediately posts this payload back to the VORTEX backend, where `verifyPayment` validates the HMAC signature using the Razorpay API secret.
6.  **Webhook Finalization**: For true asynchronous reliability, the system also listens for the `payment.captured` webhook to finalize the recovery.

## Genuine Evidence
VORTEX does not assume an intervention was successful merely because the AI requested a retry. A case is only marked as `RECOVERED` when cryptographically verified evidence (a signature or a webhook) confirms that Razorpay successfully processed the funds.

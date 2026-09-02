# VORTEX Demo Runbook

This guide helps evaluators reproduce the complete VORTEX recovery flow, demonstrating the transition from a failed payment to a verified recovery and its impact on the system's learning loop.

## Prerequisites
1. Both backend (FastAPI) and frontend (Vite/React) servers must be running.
2. Valid API keys for Gemini (`GEMINI_API_KEY`) and Razorpay (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) must be configured in `backend/.env`.

## End-to-End Evaluation Flow

### 1. View Initial Command Center
1. Navigate to the **Command Center**.
2. Observe the current **Revenue at Risk**, **Recovered Revenue**, and **Recovery Rate**.
3. Note that the **Simulated / Projected** metrics are currently unavailable or show baseline data.

### 2. Inspect a Recovery Case
1. Click **Recovery Cases** in the sidebar.
2. Open a "High" or "Critical" risk case (e.g., a failed $500 or ₹50,000 transaction).
3. **Observe**: The AI Root-Cause Diagnosis box, detailing why the payment failed, the recommended action, and its confidence score.
4. **Observe**: The Decision Intelligence matrix, showing the deterministic probability and expected net recovery.
5. **Observe**: The VORTEX Guardrails section, demonstrating that the system deterministically evaluated safety policies (like Max Attempts) before allowing an action.

### 3. Execute Bounded Recovery
1. In the Case Details view, click the primary purple button (e.g., **RETRY PAYMENT**).
2. The Razorpay Test Mode checkout modal will open.
3. Use Razorpay Test credentials (e.g., a test card) to complete the payment successfully.
4. **Observe**: The system transitions to "Recovery Confirmed". The case state becomes `RECOVERED`.

### 4. Verify the Audit Trail
1. Scroll down to the **Case Audit Timeline** on the same page.
2. **Observe**: The immutable timeline showing the diagnosis, the policy check, the payment capture, and the webhook verification.

### 5. Strategy Learning Loop
1. Navigate to **Strategy Performance**.
2. **Observe**: The successful recovery has incremented the success metrics for that specific strategy and event type.
3. **Impact**: Future cases of the same event type will now mathematically favor this strategy due to its proven historical success.

### 6. Batch Revenue Simulation (What-If)
1. Navigate to **Recovery Simulation**.
2. Click **Execute Recovery Simulation**.
3. **Observe**: VORTEX runs a batch projection using current historical statistics and strict guardrails to project how much revenue could safely be recovered across the entire queue.
4. Return to the **Command Center** to see the newly populated Projected metrics.

### 7. Policy Sandbox
1. Navigate to the **Policy What-If Lab**.
2. Adjust a policy parameter (e.g., increase the Maximum Retries).
3. Run the evaluation.
4. **Observe**: The system deeply clones the state and projects the revenue impact of the policy change without mutating actual production data.

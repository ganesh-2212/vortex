# Deployment Guide

This document covers local development, environment configuration, webhook setup, and deployment considerations for VORTEX.

> The demonstration uses Razorpay Test Mode and does not process real-money transactions.

---

## 1. Architecture Prerequisites

To run VORTEX, you need the following dependencies installed:

- **Node.js**: v18+ or v20+ (required for React + Vite frontend)
- **Python**: 3.11+ (required for FastAPI backend)
- **Razorpay Account**: A Razorpay account to obtain **Test Mode** API keys and configure webhooks.
- **Gemini API Key**: A valid Google Gemini API key to power the AI Diagnosis layer.

---

## 2. Project Structure

The deployment structure is logically separated:

```text
VORTEX
├── backend/      # FastAPI Python backend and API endpoints
├── frontend/     # React + Vite frontend SPA
├── database/     # Contains the volatile/in-memory store configuration
├── docs/         # System architecture and deployment guides
└── tests/        # Pytest test suite (47+ tests)
```

---

## 3. Backend Setup (Local Development)

The backend is built with Python 3.11+ and FastAPI.

1. **Environment Setup**:
   Navigate to the `backend/` directory, create a virtual environment, and install dependencies from `requirements.txt`.
   
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:
   Create a `.env` file in the `backend/` directory based on the `.env.example`.
   
   ```env
   ENV=development
   PROJECT_NAME="VORTEX"
   
   # Gateway Mode: 'mock' for local dev simulation, 'razorpay' for Test Mode
   PAYMENT_PROVIDER_MODE=razorpay
   
   # Razorpay Test Mode Credentials
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_test_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   
   # Gemini Configuration
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   ```
   *Do not commit this file to version control.*

3. **Start the Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

---

## 4. Frontend Setup (Local Development)

The frontend is a single-page application built with React and Vite.

1. **Install Dependencies**:
   Navigate to the `frontend/` directory and install the Node modules.
   
   ```bash
   cd frontend
   npm install
   ```

2. **API Configuration**:
   By default, the Vite dev server (`npm run dev`) or `config.ts` points to the local backend at `http://localhost:8000`. If deploying, ensure the `API_BASE_URL` points to your deployed backend URL.

3. **Start the Frontend Server**:
   ```bash
   npm run dev
   ```
   The UI will be available at `http://localhost:5173`.

---

## 5. Razorpay Webhook Configuration

For end-to-end recovery verification, VORTEX relies on Razorpay webhooks.

1. Expose your local backend (e.g., using `ngrok`):
   ```bash
   ngrok http 8000
   ```
2. Navigate to your Razorpay Dashboard (Test Mode) -> **Webhooks**.
3. Add a new webhook:
   - **Webhook URL**: `https://<your-ngrok-url>/api/v1/webhooks/razorpay`
   - **Secret**: Set this to the value you configured for `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events**: Select `payment.captured` (and optionally `payment.failed`).
4. **Safety Verification**: VORTEX explicitly verifies the `X-Razorpay-Signature` against your secret.

---

## 6. Deployed Frontend/Backend Relationship

In a production or deployed evaluator environment:

- **Backend**: The FastAPI app acts as a standalone REST API and webhook listener. It manages all state, guardrails, and Razorpay interactions.
- **Frontend**: The Vite React app compiles to static files (`npm run build`). It relies entirely on the Backend API for state. 
- **CORS**: The backend must have CORS configured to explicitly allow the frontend's deployed domain.

---

## 7. Basic Security Considerations

VORTEX implements several basic security rules that must be respected during deployment:

- **Test Mode Only**: Ensure that `RAZORPAY_KEY_ID` always starts with `rzp_test_`. Real-money `rzp_live_` keys should never be used.
- **Server-Side Secrets**: `GEMINI_API_KEY` and `RAZORPAY_KEY_SECRET` must remain securely on the backend server. The frontend never possesses these credentials.
- **Webhook Integrity**: The `RAZORPAY_WEBHOOK_SECRET` must match between the Razorpay dashboard and the backend `.env` to prevent spoofed webhook events from artificially marking cases as recovered.
- **No Env Commits**: Ensure `.env` is always excluded via `.gitignore`.
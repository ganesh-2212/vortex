# Deployment Guide

This document covers the local deployment and environment setup for VORTEX.

## Architecture Prerequisites
- **Node.js**: v18+ recommended (for frontend).
- **Python**: 3.9+ recommended (for backend).
- **Gemini API Key**: Required for the AI intelligence layer.
- **Razorpay Test Account**: Required for checkout execution and webhooks.

## Environment Configuration

In the `backend/` directory, create a `.env` file containing the following:

```env
# AI Integration
GEMINI_API_KEY="your-gemini-api-key"

# Razorpay Integration (Test Mode credentials)
RAZORPAY_KEY_ID="rzp_test_yourkeyid"
RAZORPAY_KEY_SECRET="your-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
```

*Note: Never commit your `.env` file or actual secrets to version control.*

## Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv
# Activate virtual environment
# Windows: .\.venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The backend API will run on `http://127.0.0.1:8000`.

## Frontend Setup (React/Vite)

```bash
cd frontend
npm install
npm run dev
```
The frontend application will start (typically on `http://localhost:5173`).

## Webhook Deployment Considerations
To test the full recovery verification lifecycle locally, Razorpay needs to send webhooks to your local environment.
- Use a tunneling service like **ngrok** to expose your local port 8000.
- Update your Razorpay Test Dashboard webhook settings to point to your ngrok URL: `https://<your-ngrok-url>/api/webhooks/razorpay`
- Ensure the webhook secret in the Razorpay dashboard matches your `RAZORPAY_WEBHOOK_SECRET`.

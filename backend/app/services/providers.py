from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any
import uuid

from app.models.domain import ProviderExecutionResult

class BasePaymentProvider(ABC):
    """
    Abstract base class for payment gateways (e.g. Razorpay, Stripe).
    """
    @abstractmethod
    def execute_retry(
        self,
        amount: Decimal,
        currency: str,
        payload: Dict[str, Any]
    ) -> ProviderExecutionResult:
        pass


class MockPaymentProvider(BasePaymentProvider):
    """
    Deterministic Mock Payment Provider for recovery testing.
    Does not run real payment gateway transactions.
    """
    def execute_retry(
        self,
        amount: Decimal,
        currency: str,
        payload: Dict[str, Any]
    ) -> ProviderExecutionResult:
        
        # Check simulation parameters in request payload
        simulate_failure = payload.get("simulate_failure", False)
        error_code = payload.get("error_code", "PAYMENT_REJECTED") if simulate_failure else None
        
        if simulate_failure:
            return ProviderExecutionResult(
                success=False,
                error_code=error_code,
                raw_response={
                    "gateway": "mock_provider",
                    "status": "failed",
                    "code": error_code,
                    "description": "Simulated payment failure for testing"
                }
            )
            
        # Standard successful mock transaction
        txn_id = f"pay_mock_{uuid.uuid4().hex[:12]}"
        return ProviderExecutionResult(
            success=True,
            transaction_id=txn_id,
            raw_response={
                "gateway": "mock_provider",
                "status": "captured",
                "transaction_id": txn_id,
                "amount_in_paise": int(amount * 100),
                "currency": currency
            }
        )


class RazorpayPaymentProvider(BasePaymentProvider):
    """
    Razorpay Payment Provider wrapper that validates config and simulates API retry returns.
    """
    def execute_retry(
        self,
        amount: Decimal,
        currency: str,
        payload: Dict[str, Any]
    ) -> ProviderExecutionResult:
        from app.config import settings

        # Refuse live execution when credentials are missing
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise ValueError("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing")

        simulate_failure = payload.get("simulate_failure", False)
        error_code = payload.get("error_code", "PAYMENT_REJECTED") if simulate_failure else None

        if simulate_failure:
            return ProviderExecutionResult(
                success=False,
                error_code=error_code,
                raw_response={
                    "gateway": "razorpay",
                    "status": "failed",
                    "error": {
                        "code": error_code,
                        "description": "Razorpay simulated payment rejection"
                    }
                }
            )

        txn_id = f"pay_rzp_{uuid.uuid4().hex[:12]}"
        return ProviderExecutionResult(
            success=True,
            transaction_id=txn_id,
            raw_response={
                "gateway": "razorpay",
                "status": "captured",
                "transaction_id": txn_id,
                "amount_in_paise": int(amount * 100),
                "currency": currency,
                "order_id": f"order_rzp_{uuid.uuid4().hex[:12]}"
            }
        )

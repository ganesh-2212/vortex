import hmac
import hashlib
import razorpay
from typing import Dict, Any, Optional
from decimal import Decimal

from app.config import settings

class RazorpayService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        
        # Only initialize client if keys are present
        if self.key_id and self.key_secret:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
        else:
            self.client = None
            
    def is_configured(self) -> bool:
        return bool(self.client is not None)
        
    def create_order(self, amount: Decimal, currency: str = "INR", receipt: str = "") -> Dict[str, Any]:
        """
        Creates a Razorpay Test Mode order.
        amount is provided in INR (e.g. 25000.00)
        Converts to paise (smallest unit) for Razorpay API.
        """
        if not self.is_configured():
            raise ValueError("Razorpay credentials are not configured.")
            
        amount_paise = int(amount * 100)
        
        data = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1 # auto capture
        }
        
        order = self.client.order.create(data=data)
        return order
        
    def verify_payment_signature(self, payment_id: str, order_id: str, signature: str) -> bool:
        """
        Verifies the signature returned by Razorpay Checkout.
        """
        if not self.is_configured():
            return False
            
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        
        try:
            self.client.utility.verify_payment_signature(params_dict)
            return True
        except razorpay.errors.SignatureVerificationError:
            return False
            
    def fetch_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches the payment details from Razorpay to verify status and amount.
        """
        if not self.is_configured():
            return None
        try:
            return self.client.payment.fetch(payment_id)
        except Exception:
            return None

    def verify_webhook_signature(self, raw_body: bytes, signature_header: str) -> bool:
        """
        Verifies the webhook signature using the raw HTTP body and the RAZORPAY_WEBHOOK_SECRET.
        """
        if not self.webhook_secret or not signature_header:
            return False
            
        # Implementation mirrors razorpay utility but accepts raw bytes for safety
        expected_signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature_header)

# Singleton instance
razorpay_service = RazorpayService()

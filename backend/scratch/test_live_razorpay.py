import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from app.services.razorpay_service import razorpay_service
from decimal import Decimal

try:
    print("Is configured:", razorpay_service.is_configured())
    print("Key:", razorpay_service.key_id)
    order = razorpay_service.create_order(Decimal("500.00"), "INR", "receipt_123")
    print("Order created:", order)
except Exception as e:
    print("Error:", e)

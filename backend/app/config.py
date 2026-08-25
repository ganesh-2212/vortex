import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENV: str = "development"
    PROJECT_NAME: str = "Revenue Sentinel"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/revenue_sentinel"
    RAZORPAY_WEBHOOK_SECRET: str = "test_webhook_secret"

    PAYMENT_PROVIDER_MODE: str = "mock"
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    from pydantic import field_validator

    @field_validator("PAYMENT_PROVIDER_MODE")
    @classmethod
    def validate_provider_mode(cls, v: str) -> str:
        if v not in ("mock", "razorpay"):
            raise ValueError("PAYMENT_PROVIDER_MODE must be 'mock' or 'razorpay'")
        return v

    # Allow custom .env file path configuration
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENV: str = "development"
    PROJECT_NAME: str = "Revenue Sentinel"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/revenue_sentinel"

    # Allow custom .env file path configuration
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

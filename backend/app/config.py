from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Docufy API"
    environment: str = "development"
    database_url: str = "postgresql://docufy:password@localhost:5432/docufy_db"
    anthropic_api_key: str | None = None
    claude_model: str = "claude-haiku-4-5"
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://127.0.0.1:8000/auth/google/callback"
    frontend_oauth_success_url: str = "http://127.0.0.1:5173/oauth/google/callback"
    frontend_oauth_error_url: str = "http://127.0.0.1:5173/login"
    frontend_app_url: str = "http://127.0.0.1:5173"
    frontend_billing_return_url: str = "http://127.0.0.1:5173/billing/return"
    contact_sales_email: str = "sales@docufy.ai"
    contact_sales_url: str | None = None
    dodo_payments_api_key: str | None = None
    dodo_payments_environment: str = "test_mode"
    dodo_payments_webhook_key: str | None = None
    dodo_starter_product_id: str | None = None
    dodo_growth_product_id: str | None = None
    dodo_scale_product_id: str | None = None
    jwt_secret: str = Field(default="change-me-in-production", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    max_file_size_mb: int = 10
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    rate_limit_requests_per_minute: int = 30
    bcrypt_rounds: int = 12

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def allowed_origin_list(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def dodo_api_base_url(self) -> str:
        if self.dodo_payments_environment == "test_mode":
            return "https://test.dodopayments.com"
        return "https://live.dodopayments.com"

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

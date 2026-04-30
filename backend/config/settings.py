# config/settings.py
# GENESIS — Unified Pydantic Settings (Phase 2)
#
# STRATEGY: Wraps the same env-var names the codebase already uses.
# Every existing os.getenv() call continues to work unchanged.
# New code should import `settings` from here.
# =============================================================================

from __future__ import annotations

import os
from typing import List, Optional

try:
    from pydantic_settings import BaseSettings
    from pydantic import Field
    _PYDANTIC_SETTINGS = True
except ImportError:
    _PYDANTIC_SETTINGS = False

if _PYDANTIC_SETTINGS:
    class Settings(BaseSettings):
        # App
        app_version: str     = "3.0.0"
        env: str             = Field(default="development", alias="ENV")
        port: int            = Field(default=8080, alias="PORT")
        debug: bool          = False

        # Database
        mongodb_uri: str     = Field(default="mongodb://localhost:27017", alias="MONGODB_URI")
        mongodb_db_name: str = Field(default="genesis", alias="MONGODB_DB_NAME")

        # AI
        hf_token: str        = Field(default="", alias="HF_TOKEN")
        gemma_model: str     = Field(default="default", alias="GEMMA_MODEL")
        gemini_api_key: str  = Field(default="", alias="GEMINI_API_KEY")
        kg_persist_dir: Optional[str] = Field(default=None, alias="KG_PERSIST_DIR")

        # Auth
        jwt_secret: str      = Field(default="change-me-in-production", alias="JWT_SECRET")
        jwt_algorithm: str   = "HS256"
        jwt_expire_minutes: int = 60
        refresh_token_expire_days: int = 30
        session_secret_key: str = Field(default="dev-fallback", alias="SESSION_SECRET_KEY")
        admin_username: str  = Field(default="admin", alias="ADMIN_USERNAME")
        admin_password: str  = Field(default="Genesis@2024!", alias="ADMIN_PASSWORD")

        # Security
        field_encryption_key: str = Field(default="", alias="FIELD_ENCRYPTION_KEY")
        allowed_origins: List[str] = Field(
            default=["http://localhost:5173", "http://localhost:3000"],
            alias="ALLOWED_ORIGINS",
        )

        # Storage (optional)
        s3_bucket: Optional[str] = Field(default=None, alias="S3_BUCKET")
        s3_region: str = Field(default="us-east-1", alias="S3_REGION")

        # Monitoring (optional)
        otlp_endpoint: Optional[str] = Field(default=None, alias="OTLP_ENDPOINT")
        jaeger_host: str = Field(default="localhost", alias="JAEGER_HOST")

        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            populate_by_name = True
            extra = "ignore"

        @property
        def is_production(self) -> bool:
            return self.env == "production"

    settings = Settings()

else:
    # Fallback: plain object reading from os.environ directly
    # (works even if pydantic-settings not installed)
    class _FallbackSettings:
        app_version   = "3.0.0"
        env           = os.getenv("ENV", "development")
        port          = int(os.getenv("PORT", "8080"))
        mongodb_uri   = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        mongodb_db_name = os.getenv("MONGODB_DB_NAME", "genesis")
        hf_token      = os.getenv("HF_TOKEN", "")
        gemma_model   = os.getenv("GEMMA_MODEL", "default")
        jwt_secret    = os.getenv("JWT_SECRET", "change-me-in-production")
        jwt_algorithm = "HS256"
        jwt_expire_minutes = 60
        refresh_token_expire_days = 30
        session_secret_key = os.getenv("SESSION_SECRET_KEY", "dev-fallback")
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "Genesis@2024!")
        field_encryption_key = os.getenv("FIELD_ENCRYPTION_KEY", "")
        s3_bucket = os.getenv("S3_BUCKET")
        otlp_endpoint = os.getenv("OTLP_ENDPOINT")
        jaeger_host = os.getenv("JAEGER_HOST", "localhost")
        allowed_origins = ["http://localhost:5173", "http://localhost:3000"]

        @property
        def is_production(self):
            return self.env == "production"

    settings = _FallbackSettings()

# database/models_mongo.py
# GENESIS — MongoDB Beanie Document Models
# Replaces database/models.py (SQLAlchemy ORM)
# All 8 collections defined here.

from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document, Indexed
from pymongo import IndexModel, ASCENDING
from pydantic import Field


def _now() -> datetime:
    return datetime.utcnow()


# ── 1. User ───────────────────────────────────────────────────────────────────

class User(Document):
    username:        str
    email:           Optional[str] = None
    phone:           Optional[str] = None
    display_name:    Optional[str] = None
    hashed_pw:       str
    google_id:       Optional[str] = None
    avatar_url:      Optional[str] = None
    is_admin:        bool = False
    is_active:       bool = True
    needs_name_setup: bool = False
    last_login:      Optional[datetime] = None
    created_at:      datetime = Field(default_factory=_now)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("username", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)],    unique=True, sparse=True),
            IndexModel([("phone", ASCENDING)],    unique=True, sparse=True),
            IndexModel([("google_id", ASCENDING)], unique=True, sparse=True),
        ]

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username} admin={self.is_admin}>"


# ── 2. LoginSession ───────────────────────────────────────────────────────────

class LoginSession(Document):
    user_id:       str                   # stringified ObjectId ref to User
    user_email:    Optional[str] = None
    user_name:     Optional[str] = None
    login_method:  str                   # "google" | "otp" | "password"
    ip_address:    Optional[str] = None
    user_agent:    Optional[str] = None
    logged_in_at:  datetime = Field(default_factory=_now)
    logged_out_at: Optional[datetime] = None
    is_active:     bool = True
    jwt_jti:       Optional[str] = None

    class Settings:
        name = "login_sessions"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("jwt_jti", ASCENDING)], sparse=True),
            IndexModel([("logged_in_at", ASCENDING)]),
        ]


# ── 3. Conversation ───────────────────────────────────────────────────────────

class Conversation(Document):
    user_id:         str
    title:           str = "New conversation"
    module:          str = "core"
    created_at:      datetime = Field(default_factory=_now)
    last_message_at: datetime = Field(default_factory=_now)
    is_archived:     bool = False

    class Settings:
        name = "conversations"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("last_message_at", ASCENDING)]),
        ]


# ── 4. Message ────────────────────────────────────────────────────────────────

class Message(Document):
    conversation_id: str
    role:            str          # "user" | "assistant"
    content:         str
    created_at:      datetime = Field(default_factory=_now)
    module_used:     Optional[str] = None
    latency_ms:      Optional[int] = None

    class Settings:
        name = "messages"
        indexes = [
            IndexModel([("conversation_id", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]


# ── 5. ModuleState ────────────────────────────────────────────────────────────

class ModuleState(Document):
    module_key: str
    enabled:    bool = True
    config:     Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=_now)

    class Settings:
        name = "module_states"
        indexes = [
            IndexModel([("module_key", ASCENDING)], unique=True),
        ]

    def __repr__(self) -> str:
        return f"<ModuleState key={self.module_key} enabled={self.enabled}>"


# ── 6. PromptLog ──────────────────────────────────────────────────────────────

class PromptLog(Document):
    user_id:     Optional[str] = None
    module:      str
    prompt:      str
    response:    str
    model:       Optional[str] = None
    temperature: Optional[float] = None
    tokens_used: Optional[int] = None
    latency_ms:  Optional[float] = None
    created_at:  datetime = Field(default_factory=_now)

    class Settings:
        name = "prompt_logs"
        indexes = [
            IndexModel([("user_id", ASCENDING)], sparse=True),
            IndexModel([("created_at", ASCENDING)]),
        ]

    def __repr__(self) -> str:
        return f"<PromptLog id={self.id} module={self.module}>"


# ── 7. OtpCode ────────────────────────────────────────────────────────────────

class OtpCode(Document):
    phone:      str
    code_hash:  str          # bcrypt hash of the 6-digit code
    expires_at: datetime
    used:       bool = False
    attempts:   int  = 0

    class Settings:
        name = "otp_codes"
        indexes = [
            IndexModel([("phone", ASCENDING)]),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),  # TTL
        ]


# ── 8. RateLimit (replaces Redis + in-memory dict) ───────────────────────────

class RateLimit(Document):
    key:        str          # e.g. "login:1.2.3.4", "blacklist:<jti>"
    count:      int = 1
    expires_at: datetime

    class Settings:
        name = "rate_limits"
        indexes = [
            IndexModel([("key", ASCENDING)], unique=True),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),  # TTL
        ]

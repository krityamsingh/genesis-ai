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


# ════════════════════════════════════════════════════════════════════
# Phase 4 additions — new documents, zero changes to existing ones
# ════════════════════════════════════════════════════════════════════

class UserMemory(Document):
    """Persistent per-user memory (facts, preferences, topic affinity)."""
    user_id:       str
    facts:         Dict[str, Any]   = Field(default_factory=dict)
    preferences:   Dict[str, Any]   = Field(default_factory=dict)
    summaries:     list             = Field(default_factory=list)
    topic_affinity: Dict[str, float] = Field(default_factory=dict)
    updated_at:    datetime         = Field(default_factory=_now)
    created_at:    datetime         = Field(default_factory=_now)

    class Settings:
        name = "user_memory"
        indexes = [IndexModel([("user_id", ASCENDING)], unique=True)]


class ReasoningTrace(Document):
    """Audit log for every pipeline run."""
    request_id:    str
    user_id:       Optional[str]    = None
    intent:        str              = ""
    module_chosen: str              = ""
    pipeline_mode: str              = "old"   # old | shadow | new
    latency_ms:    Dict[str, int]   = Field(default_factory=dict)
    shadow_diff:   Optional[str]    = None    # diff when shadow mode
    created_at:    datetime         = Field(default_factory=_now)

    class Settings:
        name = "reasoning_traces"
        indexes = [IndexModel([("user_id", ASCENDING)]),
                   IndexModel([("created_at", ASCENDING)])]


class UsageLog(Document):
    user_id:       str
    tokens_used:   int              = 0
    requests_made: int              = 0
    cost_estimate: float            = 0.0
    model_used:    str              = ""
    period_start:  datetime         = Field(default_factory=_now)
    period_end:    Optional[datetime] = None

    class Settings:
        name = "usage_logs"
        indexes = [IndexModel([("user_id", ASCENDING)]),
                   IndexModel([("period_start", ASCENDING)])]


class ApiKey(Document):
    user_id:       str
    name:          str
    key_hash:      str
    key_prefix:    str
    scope:         str              = "full"
    is_active:     bool             = True
    expires_at:    Optional[datetime] = None
    last_used_at:  Optional[datetime] = None
    created_at:    datetime         = Field(default_factory=_now)

    class Settings:
        name = "api_keys"
        indexes = [IndexModel([("user_id", ASCENDING)]),
                   IndexModel([("key_hash", ASCENDING)], unique=True)]


class TokenFamily(Document):
    """JWT refresh token family — supports rotation + theft detection."""
    user_id:       str
    family_id:     str
    refresh_hash:  str
    is_revoked:    bool             = False
    issued_at:     datetime         = Field(default_factory=_now)
    expires_at:    Optional[datetime] = None

    class Settings:
        name = "token_families"
        indexes = [IndexModel([("user_id", ASCENDING)]),
                   IndexModel([("family_id", ASCENDING)])]


class ModerationLog(Document):
    user_id:        Optional[str]   = None
    input_text:     str
    violation_type: str
    action_taken:   str
    created_at:     datetime        = Field(default_factory=_now)

    class Settings:
        name = "moderation_logs"
        indexes = [IndexModel([("user_id", ASCENDING)]),
                   IndexModel([("created_at", ASCENDING)])]

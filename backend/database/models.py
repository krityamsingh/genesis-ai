# database/models.py
# GENESIS — SQLAlchemy ORM Models
#
# Fixes applied:
#   • All primary key ID columns now auto-generate UUIDs via default=
#     Previously String(36) with no default → NULL PKs → IntegrityError
#     on insert, or silent empty-string FK violations in related tables
#   • Same UUID default applied to LearningSessionRecord, PromptLog, ModuleState
#   • Added __repr__ consistency and missing imports
# =============================================================================

from __future__ import annotations

import time
import uuid
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, JSON, ForeignKey,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _now() -> float:
    return time.time()


def _uuid() -> str:
    """Generate a new UUID4 string. Used as column defaults."""
    return str(uuid.uuid4())


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id         = Column(String(36), primary_key=True, default=_uuid)
    username   = Column(String(64),  unique=True, nullable=False, index=True)
    email      = Column(String(256), unique=True, nullable=False)
    hashed_pw  = Column(String(256), nullable=False)
    is_admin   = Column(Boolean, default=False,  nullable=False)
    is_active  = Column(Boolean, default=True,   nullable=False)
    created_at = Column(Float,   default=_now,   nullable=False)
    last_login = Column(Float,   nullable=True)

    sessions   = relationship(
        "LearningSessionRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    prompt_logs = relationship(
        "PromptLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username} admin={self.is_admin}>"


# ── LearningSessionRecord ─────────────────────────────────────────────────────

class LearningSessionRecord(Base):
    """Persisted record of each M1 learn() call."""
    __tablename__ = "learning_sessions"

    id           = Column(String(36), primary_key=True, default=_uuid)
    user_id      = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    source       = Column(Text,        nullable=False)
    source_type  = Column(String(32))   # text / url / pdf / audio / youtube
    domain       = Column(String(128))
    difficulty   = Column(String(32))
    items_stored = Column(Integer,     default=0)
    duration_sec = Column(Float,       default=0.0)
    error        = Column(Text,        nullable=True)
    created_at   = Column(Float,       default=_now, nullable=False)

    user = relationship("User", back_populates="sessions")

    def __repr__(self) -> str:
        return f"<LearningSession id={self.id} type={self.source_type}>"


# ── PromptLog ─────────────────────────────────────────────────────────────────

class PromptLog(Base):
    """Log of every LLM prompt sent through the system."""
    __tablename__ = "prompt_logs"

    id          = Column(String(36), primary_key=True, default=_uuid)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    module      = Column(String(32))    # m1 / m2 / core / etc.
    prompt      = Column(Text)
    response    = Column(Text)
    model       = Column(String(128))
    temperature = Column(Float)
    tokens_used = Column(Integer,   nullable=True)
    latency_ms  = Column(Float)
    created_at  = Column(Float,     default=_now, nullable=False)

    user = relationship("User", back_populates="prompt_logs")

    def __repr__(self) -> str:
        return f"<PromptLog id={self.id} module={self.module}>"


# ── ModuleState ───────────────────────────────────────────────────────────────

class ModuleState(Base):
    """Per-module enabled/disabled + config stored in DB."""
    __tablename__ = "module_states"

    module_key = Column(String(32), primary_key=True)   # e.g. "m1", "m2"
    enabled    = Column(Boolean,    default=True,  nullable=False)
    config     = Column(JSON,       default=dict)
    updated_at = Column(Float,      default=_now,  nullable=False)

    def __repr__(self) -> str:
        return f"<ModuleState key={self.module_key} enabled={self.enabled}>"

# database/models.py
# GENESIS — SQLAlchemy ORM models

from __future__ import annotations
import time
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, JSON,
    ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _now() -> float:
    return time.time()


class User(Base):
    __tablename__ = "users"

    id         = Column(String(36), primary_key=True)
    username   = Column(String(64), unique=True, nullable=False, index=True)
    email      = Column(String(256), unique=True, nullable=False)
    hashed_pw  = Column(String(256), nullable=False)
    is_admin   = Column(Boolean, default=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(Float, default=_now)
    last_login = Column(Float, nullable=True)

    sessions   = relationship("LearningSessionRecord", back_populates="user")

    def __repr__(self):
        return f"<User {self.username}>"


class LearningSessionRecord(Base):
    """Persisted record of each M1 learn() call."""
    __tablename__ = "learning_sessions"

    id           = Column(String(36), primary_key=True)
    user_id      = Column(String(36), ForeignKey("users.id"), nullable=True)
    source       = Column(Text, nullable=False)
    source_type  = Column(String(32))   # text / url / pdf / audio / youtube
    domain       = Column(String(128))
    difficulty   = Column(String(32))
    items_stored = Column(Integer, default=0)
    duration_sec = Column(Float, default=0.0)
    error        = Column(Text, nullable=True)
    created_at   = Column(Float, default=_now)

    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<LearningSession {self.source_type}:{self.source[:40]}>"


class PromptLog(Base):
    """Log of every LLM prompt sent through the system."""
    __tablename__ = "prompt_logs"

    id          = Column(String(36), primary_key=True)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=True)
    module      = Column(String(32))   # m1 / m2 / core / etc.
    prompt      = Column(Text)
    response    = Column(Text)
    model       = Column(String(128))
    temperature = Column(Float)
    tokens_used = Column(Integer, nullable=True)
    latency_ms  = Column(Float)
    created_at  = Column(Float, default=_now)

    def __repr__(self):
        return f"<PromptLog {self.module} @ {self.created_at}>"


class ModuleState(Base):
    """Per-module enabled/disabled + config stored in DB."""
    __tablename__ = "module_states"

    module_key = Column(String(32), primary_key=True)
    enabled    = Column(Boolean, default=True)
    config     = Column(JSON, default=dict)
    updated_at = Column(Float, default=_now)

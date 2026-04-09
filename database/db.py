# database/db.py
# GENESIS — Database engine & session factory
#
# FIX: Engine is created LAZILY (on first use) so that importing this module
# never crashes — even if DATABASE_URL points to an unreachable Postgres server
# or psycopg2 is not installed yet.

from __future__ import annotations
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

from database.models import Base

log = logging.getLogger("database.db")

# ── Lazy globals ────────────────────────────────────────────
_engine = None
_SessionLocal = None


def _get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./genesis.db")
    # Railway sometimes provides postgres:// URLs; SQLAlchemy 2.x needs postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def _get_engine():
    global _engine
    if _engine is None:
        url = _get_db_url()
        connect_args = {"check_same_thread": False} if "sqlite" in url else {}
        _engine = create_engine(url, connect_args=connect_args, echo=False)
    return _engine


def _get_session_local():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=_get_engine()
        )
    return _SessionLocal


# Keep module-level `engine` name for any code that imports it directly,
# but resolve it lazily via a property-like accessor instead of at import time.
def get_engine_instance():
    return _get_engine()


def init_db():
    """Create all tables. Call once at startup."""
    Base.metadata.create_all(bind=_get_engine())


def get_db() -> Session:
    """FastAPI dependency — yields a DB session."""
    db = _get_session_local()()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Context-manager version for non-FastAPI code."""
    db = _get_session_local()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

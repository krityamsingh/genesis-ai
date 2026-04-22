# api/dependencies.py
# GENESIS — FastAPI Dependency Injectors
#
# Fixes applied:
#   • Singletons now live on app.state (set during lifespan) instead of
#     @lru_cache module globals. This means:
#       - Proper teardown on shutdown
#       - No stale cached objects if env vars change between test runs
#       - Works correctly with FastAPI's dependency injection across workers
#   • Backward-compatible: if called outside a Request context (e.g. from
#     Celery tasks), falls back to creating the object directly — this covers
#     the transition period until all Celery callers are updated
#   • get_token_from_header promoted to a proper FastAPI Header dependency
# =============================================================================

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import Header, Request

log = logging.getLogger("api.dependencies")


# ── Lifespan initializer — call this from api/main.py lifespan ───────────────

def init_singletons(app) -> None:
    """
    Create all singletons and attach them to app.state.
    Call once from the FastAPI lifespan context manager.

    Usage in api/main.py:
        from api.dependencies import init_singletons

        @asynccontextmanager
        async def lifespan(app):
            init_singletons(app)
            yield
    """
    from core.gemma_engine import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph
    from core.memory_manager import MemoryManager

    token   = os.getenv("HF_TOKEN", "")
    model   = os.getenv("GEMMA_MODEL", "default")
    persist = os.getenv("KG_PERSIST_DIR", "") or None

    log.info(f"Initialising singletons: engine={model} kg_persist={persist or 'in-memory'}")

    app.state.engine = GemmaEngine(token=token, model=model)
    app.state.kg     = KnowledgeGraph(persist_dir=persist)
    app.state.memory = MemoryManager(app.state.kg)

    from modules import create_m1
    app.state.m1 = create_m1(app.state.engine, app.state.kg)

    from core.router import Router
    r = Router(app.state.engine, default_module="m1")
    r.register("m1", app.state.m1.ask)
    app.state.router = r

    log.info("Singletons initialised.")


# ── Request-scoped dependency getters ────────────────────────────────────────
# These are the FastAPI Depends() targets. They pull from app.state which was
# populated by init_singletons() above.

def get_engine(request: Request):
    """Return the shared GemmaEngine instance."""
    return request.app.state.engine


def get_kg(request: Request):
    """Return the shared KnowledgeGraph instance."""
    return request.app.state.kg


def get_m1(request: Request):
    """Return the shared M1 SelfLearner instance."""
    return request.app.state.m1


def get_memory(request: Request):
    """Return the shared MemoryManager instance."""
    return request.app.state.memory


def get_router(request: Request):
    """Return the shared Router instance."""
    return request.app.state.router


# ── Auth dependencies ─────────────────────────────────────────────────────────

def require_auth_dep(
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    FastAPI dependency: validate Bearer token and return decoded claims.
    Raises HTTP 401 if the token is missing or invalid.

    Usage:
        @router.get("/something")
        async def something(current_user: dict = Depends(require_auth_dep)):
            ...
    """
    from fastapi import HTTPException, status
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    try:
        from security.permissions import require_auth
        return require_auth(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Auth header helper ────────────────────────────────────────────────────────

def get_token_from_header(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """
    FastAPI dependency: extract Bearer token from Authorization header.

    Usage:
        @router.get("/something")
        async def something(token: str = Depends(get_token_from_header)):
            ...
    """
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


# ── Module-level fallback for non-FastAPI callers (e.g. Celery tasks) ────────
# These replicate the old lru_cache behaviour for code that calls
# get_engine() / get_kg() directly without a Request object.

def _make_engine():
    from core.gemma_engine import GemmaEngine
    token = os.getenv("HF_TOKEN", "")
    model = os.getenv("GEMMA_MODEL", "default")
    return GemmaEngine(token=token, model=model)


def _make_kg():
    from core.knowledge_graph import KnowledgeGraph
    persist = os.getenv("KG_PERSIST_DIR", "") or None
    return KnowledgeGraph(persist_dir=persist)


# Lazy module-level singletons used only by Celery / scripts
_engine_fallback = None
_kg_fallback     = None


def get_engine_for_task():
    """Get the engine singleton for use in Celery tasks (no Request available)."""
    global _engine_fallback
    if _engine_fallback is None:
        _engine_fallback = _make_engine()
    return _engine_fallback


def get_kg_for_task():
    """Get the KG singleton for use in Celery tasks (no Request available)."""
    global _kg_fallback
    if _kg_fallback is None:
        _kg_fallback = _make_kg()
    return _kg_fallback

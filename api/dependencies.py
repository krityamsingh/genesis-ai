# api/dependencies.py
# GENESIS — FastAPI Dependency Injectors
#
# Fixes applied:
#   • Singletons now live on app.state (set during lifespan) instead of
#     @lru_cache module globals.
#   • get_token_from_header promoted to a proper FastAPI Header dependency
#   • TrainingEngine and DynamicModuleLoader added to init_singletons()
#   • require_auth_dep added for protected route dependencies
# =============================================================================

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import Header, Request

log = logging.getLogger("api.dependencies")


# ── Lifespan initializer — call this from api/main.py lifespan ───────────────

def init_singletons(app) -> None:
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

    # Training Engine
    from core.training_engine import TrainingEngine
    app.state.training_engine = TrainingEngine()

    # DynamicModuleLoader — wires Router to auto-load trained models
    from core.module_loader import DynamicModuleLoader
    loader = DynamicModuleLoader.instance()
    loader.set_router(r)
    app.state.module_loader = loader

    log.info("Singletons initialised.")


# ── Request-scoped dependency getters ────────────────────────────────────────

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


# ── Auth dependency (require authenticated user) ──────────────────────────────

async def require_auth_dep(request: Request):
    """
    FastAPI Depends() target that returns the current authenticated User doc.
    Used by training_routes.py and other protected endpoints.
    Raises HTTP 401 if token is missing or invalid.
    """
    from fastapi import HTTPException
    from security.jwt_handler import decode_token
    from database.models_mongo import User

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = auth[7:]
    try:
        claims = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    user = await User.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


# ── Auth header helper ────────────────────────────────────────────────────────

def get_token_from_header(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


# ── Module-level fallback for non-FastAPI callers (e.g. Celery tasks) ────────

def _make_engine():
    from core.gemma_engine import GemmaEngine
    token = os.getenv("HF_TOKEN", "")
    model = os.getenv("GEMMA_MODEL", "default")
    return GemmaEngine(token=token, model=model)


def _make_kg():
    from core.knowledge_graph import KnowledgeGraph
    persist = os.getenv("KG_PERSIST_DIR", "") or None
    return KnowledgeGraph(persist_dir=persist)


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

# dependencies.py  (ROOT — canonical version)
# GENESIS — FastAPI Dependency Injectors + Task-safe Fallbacks
#
# FIXES (Layer Linkage):
#   • get_m1_for_task() added — Celery/script safe getter for M1
#   • get_router_for_task() added — Celery/script safe getter for Router
#   • All _for_task() fallbacks now use lazy singletons (create once, reuse)
# =============================================================================

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import Header, Request

log = logging.getLogger("api.dependencies")


# ── Lifespan initializer ─────────────────────────────────────────────────────

def init_singletons(app) -> None:
    """
    Create all singletons and attach them to app.state.
    Call ONCE from the FastAPI lifespan context manager in main.py.
    """
    from core.gemma_engine   import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph
    from core.memory_manager  import MemoryManager

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

    from core.training_engine import TrainingEngine
    app.state.training_engine = TrainingEngine()

    # ✅ DynamicModuleLoader wires itself to the Router
    from core.module_loader import DynamicModuleLoader
    loader = DynamicModuleLoader.instance()
    loader.set_router(r)
    app.state.module_loader = loader

    # ✅ Populate task-level fallback singletons so Celery workers share
    #    the same objects if they import this module after startup
    global _engine_fallback, _kg_fallback, _m1_fallback, _router_fallback
    _engine_fallback = app.state.engine
    _kg_fallback     = app.state.kg
    _m1_fallback     = app.state.m1
    _router_fallback = r

    log.info("Singletons initialised.")


# ── Request-scoped FastAPI Depends() getters ──────────────────────────────────

def get_engine(request: Request):
    """Return the shared GemmaEngine. Use as Depends(get_engine) in routes."""
    return request.app.state.engine

def get_kg(request: Request):
    """Return the shared KnowledgeGraph. Use as Depends(get_kg) in routes."""
    return request.app.state.kg

def get_m1(request: Request):
    """Return the shared M1 SelfLearner. Use as Depends(get_m1) in routes."""
    return request.app.state.m1

def get_memory(request: Request):
    """Return the shared MemoryManager. Use as Depends(get_memory) in routes."""
    return request.app.state.memory

def get_router(request: Request):
    """Return the shared Router. Use as Depends(get_router) in routes."""
    return request.app.state.router


# ── Auth dependency ───────────────────────────────────────────────────────────

async def require_auth_dep(request: Request):
    """
    FastAPI Depends() — returns the current authenticated User doc.
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


# ── Task-safe fallbacks (Celery / scripts / layers — no Request available) ────
# These are lazy singletons: created once, reused on every subsequent call.
# init_singletons() pre-populates them from app.state so Celery workers that
# import this module after the FastAPI app boots get the exact same objects.

_engine_fallback = None
_kg_fallback     = None
_m1_fallback     = None
_router_fallback = None


def _make_engine():
    from core.gemma_engine import GemmaEngine
    return GemmaEngine(token=os.getenv("HF_TOKEN", ""), model=os.getenv("GEMMA_MODEL", "default"))

def _make_kg():
    from core.knowledge_graph import KnowledgeGraph
    return KnowledgeGraph(persist_dir=os.getenv("KG_PERSIST_DIR") or None)

def _make_m1(engine=None, kg=None):
    from modules import create_m1
    e = engine or get_engine_for_task()
    k = kg    or get_kg_for_task()
    return create_m1(e, k)

def _make_router(engine=None, m1=None):
    from core.router import Router
    e  = engine or get_engine_for_task()
    m  = m1    or get_m1_for_task()
    r  = Router(e, default_module="m1")
    r.register("m1", m.ask)
    return r


def get_engine_for_task():
    """Engine singleton for Celery tasks / layers (no Request required)."""
    global _engine_fallback
    if _engine_fallback is None:
        _engine_fallback = _make_engine()
    return _engine_fallback

def get_kg_for_task():
    """KnowledgeGraph singleton for Celery tasks / scripts."""
    global _kg_fallback
    if _kg_fallback is None:
        _kg_fallback = _make_kg()
    return _kg_fallback

def get_m1_for_task():
    """M1 SelfLearner singleton for Celery tasks (no Request required).
    ✅ FIX: was missing — ingestion_tasks.py and panel_api.py were calling
    get_m1() without a Request, causing TypeError at runtime.
    """
    global _m1_fallback
    if _m1_fallback is None:
        _m1_fallback = _make_m1()
    return _m1_fallback

def get_router_for_task():
    """Router singleton for Celery tasks / scripts (no Request required)."""
    global _router_fallback
    if _router_fallback is None:
        _router_fallback = _make_router()
    return _router_fallback

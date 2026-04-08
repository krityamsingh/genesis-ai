# api/dependencies.py
# GENESIS — FastAPI dependency injectors
# All core imports are LAZY (inside functions) so that a missing env var
# or broken optional module does NOT crash the app on startup.
from __future__ import annotations
from functools import lru_cache
from typing import Optional
import os


@lru_cache(maxsize=1)
def get_engine():
    from core.gemma_engine import GemmaEngine
    token = os.getenv("HF_TOKEN", "")
    model = os.getenv("GEMMA_MODEL", "default")
    return GemmaEngine(token=token, model=model)


@lru_cache(maxsize=1)
def get_kg():
    from core.knowledge_graph import KnowledgeGraph
    persist = os.getenv("KG_PERSIST_DIR", "")
    return KnowledgeGraph(persist_dir=persist or None)


@lru_cache(maxsize=1)
def get_m1():
    from modules import create_m1
    return create_m1(get_engine(), get_kg())


@lru_cache(maxsize=1)
def get_memory():
    from core.memory_manager import MemoryManager
    return MemoryManager(get_kg())


@lru_cache(maxsize=1)
def get_router():
    from core.router import Router
    m1 = get_m1()
    r  = Router(get_engine(), default_module="m1")
    r.register("m1", m1.ask)
    return r


def get_token_from_header(authorization: Optional[str] = None) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None

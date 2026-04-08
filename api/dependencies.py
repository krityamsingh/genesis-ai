# api/dependencies.py
# GENESIS — FastAPI dependency injectors
from __future__ import annotations
from functools import lru_cache
from typing import Optional
import os

from core.gemma_engine    import GemmaEngine
from core.knowledge_graph import KnowledgeGraph
from core.memory_manager  import MemoryManager
from core.router          import Router
from modules              import create_m1


@lru_cache(maxsize=1)
def get_engine() -> GemmaEngine:
    token = os.getenv("HF_TOKEN", "")
    model = os.getenv("GEMMA_MODEL", "default")
    return GemmaEngine(token=token, model=model)


@lru_cache(maxsize=1)
def get_kg() -> KnowledgeGraph:
    persist = os.getenv("KG_PERSIST_DIR", "")
    return KnowledgeGraph(persist_dir=persist or None)


@lru_cache(maxsize=1)
def get_m1():
    return create_m1(get_engine(), get_kg())


@lru_cache(maxsize=1)
def get_memory() -> MemoryManager:
    return MemoryManager(get_kg())


@lru_cache(maxsize=1)
def get_router() -> Router:
    m1 = get_m1()
    r  = Router(get_engine(), default_module="m1")
    r.register("m1", m1.ask)
    return r


def get_token_from_header(authorization: Optional[str] = None) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None

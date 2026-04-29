# ============================================================
# core/__init__.py
# GENESIS Core — Public API
#
# Usage:
#   from core import GemmaEngine, KnowledgeGraph, MemoryManager, Router
#
#   engine = GemmaEngine(token=HF_TOKEN)
#   kg     = KnowledgeGraph()
#   mem    = MemoryManager(kg)
#   router = Router(engine)
# ============================================================

from core.gemma_engine    import GemmaEngine, GEMMA4_MODELS
from core.knowledge_graph import KnowledgeGraph
from core.memory_manager  import MemoryManager, Turn, Session
from core.router          import Router
from core.voice_interface import VoiceInterface

__all__ = [
    # Engine
    "GemmaEngine",
    "GEMMA4_MODELS",
    # Knowledge
    "KnowledgeGraph",
    # Memory
    "MemoryManager",
    "Turn",
    "Session",
    # Routing
    "Router",
    # Voice
    "VoiceInterface",
]

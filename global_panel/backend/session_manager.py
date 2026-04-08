# global_panel/backend/session_manager.py
from __future__ import annotations
from core.memory_manager import MemoryManager
from core.knowledge_graph import KnowledgeGraph

_sessions: dict[str, MemoryManager] = {}


def get_session(session_id: str, kg: KnowledgeGraph) -> MemoryManager:
    if session_id not in _sessions:
        _sessions[session_id] = MemoryManager(kg, session_id=session_id)
    return _sessions[session_id]


def list_sessions() -> list[str]:
    return list(_sessions.keys())


def clear_session(session_id: str):
    if session_id in _sessions:
        _sessions[session_id].clear()


def save_all(kg: KnowledgeGraph):
    for sid, mem in _sessions.items():
        mem.save_to_kg(label=sid)

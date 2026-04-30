# ============================================================
# core/memory_manager.py
# GENESIS — Conversation & Session Memory Manager
#
# Manages short-term (conversation) and long-term (session)
# memory for GENESIS agents.  Wires into KnowledgeGraph for
# persistent long-term storage.
#
# Usage:
#   mem = MemoryManager(kg)
#   mem.add_turn("user", "What is backpropagation?")
#   mem.add_turn("assistant", "Backpropagation is...")
#   ctx = mem.get_context()          # formatted history string
#   mem.save_to_kg("session_001")    # persist to KG
#   mem.load_from_kg("session_001")  # reload later
#   mem.clear()
# ============================================================

from __future__ import annotations

import time
from dataclasses import dataclass, field, asdict
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.knowledge_graph import KnowledgeGraph


# ============================================================
# Data models
# ============================================================

@dataclass
class Turn:
    role:       str       # "user" | "assistant" | "system"
    content:    str
    timestamp:  float = field(default_factory=time.time)
    metadata:   dict  = field(default_factory=dict)

    def format(self) -> str:
        label = self.role.upper()
        return f"[{label}]: {self.content}"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Session:
    session_id: str
    turns:      list[Turn] = field(default_factory=list)
    created_at: float      = field(default_factory=time.time)
    tags:       list[str]  = field(default_factory=list)

    @property
    def turn_count(self) -> int:
        return len(self.turns)

    def to_text(self) -> str:
        return "\n".join(t.format() for t in self.turns)


# ============================================================
# MemoryManager
# ============================================================

class MemoryManager:
    """
    GENESIS memory layer.

    Short-term:  in-memory ring buffer of recent turns.
    Long-term:   KnowledgeGraph collection "memory".

    Args:
        kg:              KnowledgeGraph instance
        max_turns:       max turns kept in short-term buffer (default 20)
        session_id:      optional ID; auto-generated if omitted
    """

    _COLLECTION = "memory"

    def __init__(
        self,
        kg: "KnowledgeGraph",
        max_turns: int = 20,
        session_id: Optional[str] = None,
    ):
        self.kg         = kg
        self.max_turns  = max_turns

        import uuid
        self.session_id = session_id or str(uuid.uuid4())[:8]
        self._session   = Session(session_id=self.session_id)
        self._buffer:   list[Turn] = []    # short-term ring buffer

        print(f"[MemoryManager] Ready  session={self.session_id}")

    # ── write ─────────────────────────────────────────────

    def add_turn(
        self,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ):
        """Add a conversation turn to short-term memory."""
        turn = Turn(role=role, content=content, metadata=metadata or {})
        self._buffer.append(turn)
        self._session.turns.append(turn)

        # Ring buffer: drop oldest if over limit
        if len(self._buffer) > self.max_turns:
            self._buffer.pop(0)

    def add_user(self, content: str, **meta):
        self.add_turn("user", content, meta)

    def add_assistant(self, content: str, **meta):
        self.add_turn("assistant", content, meta)

    def add_system(self, content: str, **meta):
        self.add_turn("system", content, meta)

    # ── read ──────────────────────────────────────────────

    def get_context(
        self,
        n_turns: Optional[int] = None,
        as_list: bool = False,
    ) -> str | list[dict]:
        """
        Return recent conversation context.

        Args:
            n_turns:  number of recent turns (default: all in buffer)
            as_list:  if True return list[dict] for chat_completion API

        Returns:
            Formatted string or list of {"role": ..., "content": ...}
        """
        turns = self._buffer[-n_turns:] if n_turns else self._buffer

        if as_list:
            return [{"role": t.role, "content": t.content} for t in turns]

        return "\n".join(t.format() for t in turns)

    def get_summary_prompt(self) -> str:
        """Return a prompt string with conversation history for LLM context."""
        ctx = self.get_context()
        if not ctx:
            return ""
        return f"Conversation history:\n{ctx}\n\n"

    def last_user_message(self) -> Optional[str]:
        for turn in reversed(self._buffer):
            if turn.role == "user":
                return turn.content
        return None

    def last_assistant_message(self) -> Optional[str]:
        for turn in reversed(self._buffer):
            if turn.role == "assistant":
                return turn.content
        return None

    # ── persistence ───────────────────────────────────────

    def save_to_kg(self, label: Optional[str] = None):
        """
        Persist current session turns to KnowledgeGraph under
        collection "memory".
        """
        text = self._session.to_text()
        if not text.strip():
            return
        doc_id = f"session_{label or self.session_id}"
        self.kg.store(
            self._COLLECTION,
            text,
            metadata={
                "session_id": self.session_id,
                "turns":      str(self._session.turn_count),
                "created_at": str(int(self._session.created_at)),
                "label":      label or self.session_id,
            },
            doc_id=doc_id,
        )
        print(f"[MemoryManager] Saved session '{doc_id}' to KG.")

    def load_from_kg(self, label: str) -> bool:
        """
        Load a previously saved session from KnowledgeGraph.
        Returns True if found and loaded.
        """
        doc_id = f"session_{label}"
        results = self.kg.search(
            self._COLLECTION, label, n_results=1
        )
        if not results:
            print(f"[MemoryManager] Session '{label}' not found in KG.")
            return False

        # Replay turns from stored text
        self._buffer.clear()
        for line in results[0].splitlines():
            if line.startswith("[USER]:"):
                self.add_turn("user", line[7:].strip())
            elif line.startswith("[ASSISTANT]:"):
                self.add_turn("assistant", line[12:].strip())
            elif line.startswith("[SYSTEM]:"):
                self.add_turn("system", line[9:].strip())
        print(f"[MemoryManager] Loaded {len(self._buffer)} turns from '{label}'.")
        return True

    def search_memory(self, query: str, n: int = 3) -> list[str]:
        """Search long-term memory (all saved sessions) for relevant context."""
        return self.kg.search(self._COLLECTION, query, n_results=n)

    # ── utility ───────────────────────────────────────────

    def clear(self):
        """Clear short-term buffer (does not delete KG storage)."""
        self._buffer.clear()

    def stats(self) -> dict:
        return {
            "session_id":     self.session_id,
            "buffer_turns":   len(self._buffer),
            "total_turns":    self._session.turn_count,
            "max_turns":      self.max_turns,
            "kg_memory_docs": self.kg.count(self._COLLECTION),
        }

    def __repr__(self) -> str:
        return (
            f"<MemoryManager session={self.session_id} "
            f"turns={len(self._buffer)}/{self.max_turns}>"
        )

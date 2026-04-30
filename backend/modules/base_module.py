# ============================================================
# modules/base_module.py
# GENESIS — Base Module Interface
#
# All GENESIS modules (M1–M6) inherit from BaseModule.
# Provides a standard interface for the Router and admin panel.
#
# Subclass contract:
#   - Implement run(query: str) -> str
#   - Call super().__init__(engine, kg, name="mx_...")
# ============================================================

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class BaseModule(ABC):
    """
    Abstract base for all GENESIS modules.

    Provides:
        - Standard __init__ wiring (engine + kg)
        - run() dispatcher with timing + error handling
        - stats() for admin panel
        - __call__() so modules work directly with Router
    """

    #: Override in subclass  e.g. "m1_self_learner"
    MODULE_NAME: str = "base"

    def __init__(
        self,
        engine: "GemmaEngine",
        kg: "KnowledgeGraph",
        name: Optional[str] = None,
    ):
        self.engine = engine
        self.kg     = kg
        self.name   = name or self.MODULE_NAME

        self._call_count   = 0
        self._error_count  = 0
        self._total_ms     = 0.0

    # ── public interface ──────────────────────────────────

    @abstractmethod
    def run(self, query: str) -> str:
        """
        Main entry point for this module.
        Subclasses must implement this.
        """
        ...

    def __call__(self, query: str) -> str:
        """Called by the Router. Wraps run() with timing + error handling."""
        t0 = time.time()
        self._call_count += 1
        try:
            result = self.run(query)
            self._total_ms += (time.time() - t0) * 1000
            return result
        except Exception as e:
            self._error_count += 1
            self._total_ms    += (time.time() - t0) * 1000
            return f"[{self.name}] Error: {e}"

    def stats(self) -> dict:
        avg_ms = (
            self._total_ms / self._call_count
            if self._call_count else 0.0
        )
        return {
            "module":       self.name,
            "calls":        self._call_count,
            "errors":       self._error_count,
            "avg_ms":       round(avg_ms, 1),
        }

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name} calls={self._call_count}>"

# ============================================================
# modules/m5_intuition_engine/cross_module_glue.py
# GENESIS M5 — Cross-Module Glue
#
# Synthesises outputs from multiple modules into a unified
# insight. Coordinates M1-M4 outputs and finds meta-patterns.
# ============================================================
from __future__ import annotations
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class CrossModuleGlue:
    """
    Combines outputs from M1–M4 into a unified cross-domain insight.
    """

    _PROMPT = """\
You are GENESIS M5 — the Intuition Engine.

The following outputs were produced by different specialist modules:

{module_outputs}

Your task:
1. Find meta-patterns across these outputs
2. Identify what no single module could see alone
3. Generate a unified insight statement
4. Suggest what to investigate next

Be visionary, creative, and scientifically grounded.
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def synthesise(self, module_outputs: dict[str, str]) -> str:
        """
        Combine outputs from named modules into a unified insight.

        Args:
            module_outputs: {"m1": "...", "m2": "...", "m4": "..."}

        Returns:
            Unified insight string.
        """
        formatted = "\n\n".join(
            f"[{mod.upper()}]:\n{output}"
            for mod, output in module_outputs.items()
        )
        return self.engine.think(
            prompt=self._PROMPT.format(module_outputs=formatted),
            temperature=0.8,
            max_tokens=1500,
        )

    def cross_kg_insight(self, query: str, n: int = 8) -> str:
        """Pull diverse knowledge chunks and synthesise a cross-domain insight."""
        chunks = self.kg.search("knowledge", query, n_results=n)
        if not chunks:
            return "No knowledge found. Add content with M1 first."
        combined = "\n\n---\n\n".join(chunks)
        return self.engine.think(
            prompt=(
                f"Cross-domain synthesis of:\n{combined[:5000]}\n\n"
                "Find the deepest non-obvious insight connecting all of this."
            ),
            system_prompt=(
                "You are a visionary polymath. Connect disparate ideas. "
                "Be specific and surprising."
            ),
            temperature=0.85,
            max_tokens=1200,
        )

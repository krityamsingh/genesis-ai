# ============================================================
# modules/m5_intuition_engine/gap_filler.py
# GENESIS M5 — Knowledge Gap Filler
#
# Detects and fills gaps in stored knowledge by synthesising
# from adjacent concepts, analogical reasoning, and LLM inference.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class FilledGap:
    gap_description: str
    inferred_content: str
    confidence:       str      # high / medium / low / speculative
    supporting_facts: list[str]
    stored:           bool = False


class GapFiller:
    """Infer missing knowledge from adjacent stored concepts."""

    _PROMPT = """\
The knowledge base lacks information about: {gap}

Adjacent knowledge available:
{context}

Using analogical reasoning and known principles, infer what can be said
about the gap topic. Be clear about confidence level.

Return ONLY valid JSON:
{{
  "inferred_content": "what can be reasonably inferred",
  "confidence":       "high|medium|low|speculative",
  "supporting_facts": ["fact1 that supports this inference", "fact2"]
}}
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def fill(self, gap_description: str,
             store: bool = True) -> FilledGap:
        """Infer content for a knowledge gap and optionally store it."""
        # Pull adjacent knowledge
        words    = gap_description.split()
        adjacent = []
        for word in words[:5]:
            chunks = self.kg.search("knowledge", word, n_results=2)
            adjacent.extend(chunks)
        context = "\n\n".join(adjacent[:6]) if adjacent else "No adjacent knowledge."

        raw  = self.engine.think_json(
            self._PROMPT.format(gap=gap_description, context=context[:4000]),
            temperature=0.5, max_tokens=1024,
        )
        data = self._safe_json(raw)

        filled = FilledGap(
            gap_description  = gap_description,
            inferred_content = data.get("inferred_content", ""),
            confidence       = data.get("confidence", "low"),
            supporting_facts = data.get("supporting_facts", []),
        )

        if store and filled.inferred_content:
            self.kg.store(
                "knowledge",
                f"INFERRED [{filled.confidence}]: {filled.inferred_content}",
                metadata={"source": "m5_gap_filler", "type": "inferred",
                          "gap": gap_description, "confidence": filled.confidence},
            )
            filled.stored = True

        return filled

    def fill_all_gaps(self, topic: str) -> list[FilledGap]:
        """Find gaps in topic knowledge and fill them all."""
        from modules.m1_self_learner.knowledge_builder import KnowledgeGap
        # Reuse M1 gap detection logic
        existing = "\n\n".join(self.kg.search("knowledge", topic, n_results=5))
        raw = self.engine.think(
            f"Topic: {topic}\nKnowledge: {existing[:3000]}\n\n"
            "List 3 important knowledge gaps as JSON: "
            '[{"topic":"...","description":"..."}]',
            system_prompt="Return JSON only.",
            temperature=0.4,
        )
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            gaps = json.loads(clean)
        except Exception:
            gaps = []
        return [self.fill(g.get("description", ""), store=True) for g in gaps]

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

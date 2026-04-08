# ============================================================
# modules/m2_research_accel/hypothesis_gen.py
# GENESIS M2 — Hypothesis Generator
#
# Generates novel, testable hypotheses by synthesising
# knowledge from the KnowledgeGraph + parsed papers.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class Hypothesis:
    statement:    str
    reasoning:    str
    test_method:  str
    impact_score: int          # 1-10
    domain:       str
    related_refs: list[str] = field(default_factory=list)

    def format(self) -> str:
        return (
            f"HYPOTHESIS: {self.statement}\n"
            f"REASONING:  {self.reasoning}\n"
            f"TEST:       {self.test_method}\n"
            f"IMPACT:     {self.impact_score}/10\n"
        )


class HypothesisGenerator:
    """
    Generates hypotheses from stored knowledge + optional paper context.
    """

    _PROMPT = """\
You are a world-class research scientist.

Background knowledge:
{context}

Generate {n} novel, testable research hypotheses about: {topic}

Return ONLY a JSON array (no markdown):
[
  {{
    "statement":    "clear, falsifiable hypothesis statement",
    "reasoning":    "why this might be true based on the knowledge",
    "test_method":  "concrete way to test / validate",
    "impact_score": 8,
    "domain":       "sub-domain string",
    "related_refs": ["relevant paper or fact"]
  }}
]
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def generate(self, topic: str, n: int = 3,
                 extra_context: str = "") -> list[Hypothesis]:
        """Generate n hypotheses about topic."""
        chunks  = self.kg.search("knowledge", topic, n_results=6)
        context = "\n\n".join(chunks) if chunks else "No prior knowledge stored."
        if extra_context:
            context = extra_context + "\n\n" + context

        raw = self.engine.think_json(
            self._PROMPT.format(topic=topic, n=n, context=context[:4000]),
            temperature=0.9, max_tokens=2048,
        )

        items = self._parse_list(raw)
        return [
            Hypothesis(
                statement    = h.get("statement", ""),
                reasoning    = h.get("reasoning", ""),
                test_method  = h.get("test_method", ""),
                impact_score = int(h.get("impact_score", 5)),
                domain       = h.get("domain", topic),
                related_refs = h.get("related_refs", []),
            )
            for h in items if h.get("statement")
        ]

    def format_all(self, hypotheses: list[Hypothesis]) -> str:
        if not hypotheses:
            return "No hypotheses generated."
        lines = [f"🔬 {len(hypotheses)} Hypotheses\n{'='*50}"]
        for i, h in enumerate(hypotheses, 1):
            lines.append(f"\n[{i}] {h.format()}")
        return "\n".join(lines)

    @staticmethod
    def _parse_list(raw: str) -> list[dict]:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        match = re.search(r"\[.*\]", clean, re.DOTALL)
        if match:
            clean = match.group(0)
        try:
            result = json.loads(clean)
            return result if isinstance(result, list) else []
        except Exception:
            return []

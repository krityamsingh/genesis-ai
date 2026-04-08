# ============================================================
# modules/m2_research_accel/connection_finder.py
# GENESIS M2 — Cross-Paper Connection Finder
#
# Finds non-obvious connections between stored papers
# and knowledge chunks across domains.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class Connection:
    concept_a:   str
    concept_b:   str
    relationship: str
    strength:    str          # weak / moderate / strong
    implication: str

    def format(self) -> str:
        return (
            f"• [{self.strength.upper()}] {self.concept_a} ↔ {self.concept_b}\n"
            f"  Relationship: {self.relationship}\n"
            f"  Implication:  {self.implication}"
        )


class ConnectionFinder:
    """
    Finds latent connections between papers and knowledge domains.
    """

    _PROMPT = """\
You are a cross-domain synthesis expert.

Given this body of knowledge:
{knowledge}

Find {n} non-obvious, high-value connections between different concepts, papers, or domains.
Return ONLY valid JSON array:
[
  {{
    "concept_a":    "first concept/paper/idea",
    "concept_b":    "second concept/paper/idea",
    "relationship": "how they connect",
    "strength":     "weak|moderate|strong",
    "implication":  "what this connection implies for research"
  }}
]
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def find(self, query: str = "everything", n: int = 5) -> list[Connection]:
        chunks = self.kg.search("knowledge", query, n_results=10)
        if not chunks:
            return []

        knowledge = "\n\n---\n\n".join(chunks)[:5000]
        raw = self.engine.think_json(
            self._PROMPT.format(knowledge=knowledge, n=n),
            temperature=0.8, max_tokens=2048,
        )

        items = self._parse_list(raw)
        return [
            Connection(
                concept_a    = c.get("concept_a", ""),
                concept_b    = c.get("concept_b", ""),
                relationship = c.get("relationship", ""),
                strength     = c.get("strength", "moderate"),
                implication  = c.get("implication", ""),
            )
            for c in items if c.get("concept_a")
        ]

    def format_all(self, connections: list[Connection]) -> str:
        if not connections:
            return "No connections found. Add more knowledge first."
        lines = [f"🔗 {len(connections)} Cross-Domain Connections\n{'='*50}"]
        for i, c in enumerate(connections, 1):
            lines.append(f"\n[{i}] {c.format()}")
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

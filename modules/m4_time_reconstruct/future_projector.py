# ============================================================
# modules/m4_time_reconstruct/future_projector.py
# GENESIS M4 — Future Projector
#
# Projects probable future developments for a topic
# using trend analysis + Gemma synthesis.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class FutureScenario:
    timeframe:   str         # "2025", "2030", "2050"
    probability: str         # high / medium / low
    description: str
    drivers:     list[str]   # what causes this
    risks:       list[str]


@dataclass
class FutureProjection:
    topic:       str
    scenarios:   list[FutureScenario]
    key_drivers: list[str]
    wild_cards:  list[str]   # unexpected events that could change everything

    def format(self) -> str:
        lines = [f"🔮 Future Projection: {self.topic}", ""]
        for s in self.scenarios:
            p = {"high": "🟢", "medium": "🟡", "low": "🔴"}.get(s.probability, "⚪")
            lines.append(f"{p} [{s.timeframe}] {s.description}")
            if s.drivers:
                lines.append(f"   Drivers: {', '.join(s.drivers[:3])}")
        lines += ["", f"Wild cards: {', '.join(self.wild_cards[:3])}"]
        return "\n".join(lines)


class FutureProjector:
    """Project future developments using stored knowledge + LLM reasoning."""

    _PROMPT = """\
Project future developments for: {topic}
Timeframes: near-term (1-3yr), mid-term (5-10yr), long-term (20-50yr)

Background:
{context}

Return ONLY valid JSON:
{{
  "key_drivers": ["driver1", "driver2"],
  "wild_cards":  ["unexpected event that could change everything"],
  "scenarios": [
    {{
      "timeframe":   "2027",
      "probability": "high|medium|low",
      "description": "what will happen",
      "drivers":     ["cause1"],
      "risks":       ["downside risk"]
    }}
  ]
}}
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def project(self, topic: str) -> FutureProjection:
        chunks  = self.kg.search("knowledge", topic, n_results=5)
        context = "\n\n".join(chunks) if chunks else "Use general knowledge."

        raw  = self.engine.think_json(
            self._PROMPT.format(topic=topic, context=context[:4000]),
            temperature=0.7, max_tokens=2500,
        )
        data = self._safe_json(raw)
        raw_scenarios = data.get("scenarios", [])
        scenarios = []
        for s in raw_scenarios:
            if isinstance(s, dict) and s.get("description"):
                scenarios.append(FutureScenario(
                    timeframe   = str(s.get("timeframe", "?")),
                    probability = s.get("probability", "medium"),
                    description = s.get("description", ""),
                    drivers     = s.get("drivers", []),
                    risks       = s.get("risks", []),
                ))
            elif hasattr(s, "description") and s.description:
                scenarios.append(s)
        return FutureProjection(
            topic       = topic,
            scenarios   = scenarios,
            key_drivers = data.get("key_drivers", []),
            wild_cards  = data.get("wild_cards", []),
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

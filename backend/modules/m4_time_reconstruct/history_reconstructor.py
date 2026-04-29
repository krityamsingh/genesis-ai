# ============================================================
# modules/m4_time_reconstruct/history_reconstructor.py
# GENESIS M4 — History Reconstructor
#
# Takes a topic and reconstructs a historical timeline from
# stored knowledge + LLM synthesis.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class HistoricalEvent:
    year:        str
    event:       str
    significance: str
    actors:      list[str] = field(default_factory=list)
    sources:     list[str] = field(default_factory=list)


@dataclass
class HistoricalTimeline:
    topic:    str
    events:   list[HistoricalEvent]
    summary:  str
    era_span: str       # e.g. "1945–2024"

    def format(self) -> str:
        lines = [f"📅 Timeline: {self.topic}  ({self.era_span})", ""]
        for e in sorted(self.events, key=lambda x: x.year):
            lines.append(f"[{e.year}] {e.event}")
            lines.append(f"        → {e.significance}")
        lines += ["", f"Summary: {self.summary}"]
        return "\n".join(lines)


class HistoryReconstructor:
    """Reconstruct historical timelines from knowledge + LLM."""

    _PROMPT = """\
Reconstruct a historical timeline for: {topic}

Use this background knowledge:
{context}

Return ONLY valid JSON:
{{
  "era_span": "1900–2024",
  "summary":  "brief narrative overview",
  "events": [
    {{
      "year":         "1969",
      "event":        "Moon landing",
      "significance": "First humans on Moon",
      "actors":       ["NASA", "Neil Armstrong"],
      "sources":      []
    }}
  ]
}}
Include 5-15 events, sorted chronologically.
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def reconstruct(self, topic: str) -> HistoricalTimeline:
        chunks  = self.kg.search("knowledge", topic, n_results=6)
        context = "\n\n".join(chunks) if chunks else "Use general knowledge."

        raw  = self.engine.think_json(
            self._PROMPT.format(topic=topic, context=context[:4000]),
            temperature=0.4, max_tokens=3000,
        )
        data = self._safe_json(raw)
        raw_events = data.get("events", [])
        events = []
        for e in raw_events:
            if isinstance(e, dict) and e.get("event"):
                events.append(HistoricalEvent(
                    year         = str(e.get("year", "?")),
                    event        = e.get("event", ""),
                    significance = e.get("significance", ""),
                    actors       = e.get("actors", []),
                    sources      = e.get("sources", []),
                ))
            elif hasattr(e, "event") and e.event:
                events.append(e)
        return HistoricalTimeline(
            topic    = topic,
            events   = events,
            summary  = data.get("summary", ""),
            era_span = data.get("era_span", ""),
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

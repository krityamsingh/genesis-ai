# ============================================================
# modules/m6_reality_sim/world_observer.py
# GENESIS M6 — World Observer
#
# Observes and snapshots real-world state from URLs, APIs,
# or stored knowledge to use as simulation starting conditions.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional
import time

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class WorldSnapshot:
    topic:       str
    timestamp:   float = field(default_factory=time.time)
    state:       dict  = field(default_factory=dict)   # key variables
    description: str   = ""
    sources:     list[str] = field(default_factory=list)

    def to_prompt(self) -> str:
        vars_ = "\n".join(f"  {k}: {v}" for k, v in self.state.items())
        return (
            f"World State: {self.topic}\n"
            f"Timestamp: {int(self.timestamp)}\n"
            f"Variables:\n{vars_}\n"
            f"Context: {self.description}"
        )


class WorldObserver:
    """Capture real-world state as a snapshot for simulation."""

    _PROMPT = """\
Observe and extract the current state of: {topic}

Background knowledge:
{context}

Return ONLY valid JSON describing key quantifiable variables:
{{
  "description": "brief state description",
  "state": {{
    "variable_name": "current value or estimate",
    "another_var":   "value"
  }},
  "sources": ["source1"]
}}
Include 5-10 key measurable variables relevant to simulating this system.
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def observe(self, topic: str, url: Optional[str] = None) -> WorldSnapshot:
        """Snapshot the current state of a topic."""
        chunks  = self.kg.search("knowledge", topic, n_results=5)
        context = "\n\n".join(chunks) if chunks else "Use general knowledge."

        if url:
            try:
                from modules.m1_self_learner.ingestion import Ingestion
                web_text = Ingestion.from_url(url)
                context  = web_text + "\n\n" + context
            except Exception:
                pass

        raw  = self.engine.think_json(
            self._PROMPT.format(topic=topic, context=context[:4000]),
            temperature=0.2, max_tokens=1024,
        )
        data = self._safe_json(raw)
        return WorldSnapshot(
            topic       = topic,
            state       = data.get("state", {}),
            description = data.get("description", ""),
            sources     = data.get("sources", []),
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

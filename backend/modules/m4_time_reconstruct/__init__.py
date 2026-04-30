# modules/m4_time_reconstruct/__init__.py — GENESIS M4
from __future__ import annotations
from modules.base_module import BaseModule
from modules.m4_time_reconstruct.history_reconstructor import HistoryReconstructor, HistoricalTimeline
from modules.m4_time_reconstruct.future_projector      import FutureProjector, FutureProjection
from modules.m4_time_reconstruct.visual_analyzer       import VisualAnalyzer, VisualContext
from modules.m4_time_reconstruct.timeline_renderer     import TimelineRenderer
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class M4(BaseModule):
    """GENESIS M4 — Time Reconstruct: history • future • vision • render."""

    MODULE_NAME = "m4_time_reconstruct"

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        super().__init__(engine, kg)
        self.historian  = HistoryReconstructor(engine, kg)
        self.projector  = FutureProjector(engine, kg)
        self.vision     = VisualAnalyzer(engine)
        self.renderer   = TimelineRenderer()
        print("[M4] Time Reconstruct ready — History • Future • Vision • Renderer")

    def run(self, query: str) -> str:
        q = query.lower()
        if any(k in q for k in ["future", "predict", "project", "will"]):
            return self.future(query.replace("future of", "").strip())
        return self.history(query)

    def history(self, topic: str, fmt: str = "ascii") -> str:
        tl = self.historian.reconstruct(topic)
        if fmt == "markdown":
            return self.renderer.to_markdown(tl)
        if fmt == "json":
            return self.renderer.to_json(tl)
        return self.renderer.to_ascii(tl)

    def future(self, topic: str) -> str:
        proj = self.projector.project(topic)
        return self.renderer.future_to_markdown(proj)

    def analyze_image(self, image_path: str) -> VisualContext:
        return self.vision.analyze(image_path)


__all__ = ["M4", "HistoryReconstructor", "HistoricalTimeline",
           "FutureProjector", "FutureProjection", "VisualAnalyzer", "TimelineRenderer"]

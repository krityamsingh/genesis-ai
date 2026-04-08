# ============================================================
# modules/m4_time_reconstruct/visual_analyzer.py
# GENESIS M4 — Visual Analyzer
#
# Analyses images/frames for historical or temporal context
# using GemmaEngine vision capability.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine


@dataclass
class VisualContext:
    image_path:  str
    era:         str         # estimated time period
    description: str
    objects:     list[str]
    historical_clues: list[str]
    confidence:  str         # high / medium / low


class VisualAnalyzer:
    """Analyse images for historical/temporal context using Gemma vision."""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def analyze(self, image_path: str) -> VisualContext:
        prompt = (
            "Analyse this image for historical/temporal context. "
            "Identify: the approximate time period, key objects, "
            "historical clues (clothing, technology, architecture), "
            "and describe what you see. "
            "Reply in format: ERA: ... | OBJECTS: ... | CLUES: ... | DESCRIPTION: ..."
        )
        response = self.engine.see(image_path, question=prompt)

        era    = self._extract(response, "ERA")
        objs   = self._extract(response, "OBJECTS").split(",")
        clues  = self._extract(response, "CLUES").split(",")
        desc   = self._extract(response, "DESCRIPTION")

        return VisualContext(
            image_path       = image_path,
            era              = era.strip(),
            description      = desc.strip(),
            objects          = [o.strip() for o in objs if o.strip()],
            historical_clues = [c.strip() for c in clues if c.strip()],
            confidence       = "medium",
        )

    def analyze_batch(self, image_paths: list[str]) -> list[VisualContext]:
        results = []
        for path in image_paths:
            try:
                results.append(self.analyze(path))
            except Exception as e:
                print(f"   [VisualAnalyzer] Error on {path}: {e}")
        return results

    @staticmethod
    def _extract(text: str, key: str) -> str:
        import re
        match = re.search(rf"{key}:\s*([^|]+)", text, re.IGNORECASE)
        return match.group(1).strip() if match else ""

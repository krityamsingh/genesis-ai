# ============================================================
# modules/m2_research_accel/ranker.py
# GENESIS M2 — Paper / Result Ranker
#
# Ranks papers, hypotheses, or search results by relevance,
# novelty, and impact using LLM scoring.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine


@dataclass
class RankedItem:
    item:          Any
    relevance:     float      # 0-1
    novelty:       float      # 0-1
    impact:        float      # 0-1
    overall_score: float      # weighted average
    justification: str

    def __lt__(self, other: "RankedItem") -> bool:
        return self.overall_score < other.overall_score


class Ranker:
    """
    LLM-powered ranker for papers, hypotheses, or any text items.
    """

    _RANK_PROMPT = """\
Rate each item below for relevance to "{query}", novelty, and scientific impact.
Return ONLY valid JSON array with same number of items as input:
[
  {{
    "relevance":     0.9,
    "novelty":       0.7,
    "impact":        0.8,
    "justification": "one sentence"
  }}
]

Items to rank:
{items_text}
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def rank(
        self,
        items: list[Any],
        query: str,
        text_fn=str,                    # how to turn each item to text
        weights: tuple = (0.4, 0.3, 0.3),  # relevance, novelty, impact
    ) -> list[RankedItem]:
        """
        Rank a list of items against a query.

        Args:
            items:    list of anything
            query:    what we're optimising for
            text_fn:  callable(item) -> str for the LLM to read
            weights:  (relevance_w, novelty_w, impact_w)

        Returns:
            List of RankedItem, sorted best-first.
        """
        if not items:
            return []

        items_text = "\n\n".join(
            f"[{i+1}] {text_fn(item)[:500]}"
            for i, item in enumerate(items)
        )

        raw = self.engine.think_json(
            self._RANK_PROMPT.format(query=query, items_text=items_text),
            temperature=0.1, max_tokens=2048,
        )

        scores = self._parse_list(raw)
        # Pad with neutral scores if LLM returned fewer items than expected
        while len(scores) < len(items):
            scores.append({"relevance": 0.5, "novelty": 0.5, "impact": 0.5,
                           "justification": "no score returned"})
        r_w, n_w, i_w = weights
        ranked = []
        for item, score in zip(items, scores):
            rel = float(score.get("relevance", 0.5))
            nov = float(score.get("novelty",   0.5))
            imp = float(score.get("impact",    0.5))
            overall = r_w * rel + n_w * nov + i_w * imp
            ranked.append(RankedItem(
                item          = item,
                relevance     = rel,
                novelty       = nov,
                impact        = imp,
                overall_score = round(overall, 3),
                justification = score.get("justification", ""),
            ))

        return sorted(ranked, reverse=True)

    def rank_texts(self, texts: list[str], query: str) -> list[str]:
        """Simplified version — rank plain strings, return sorted strings."""
        ranked = self.rank(texts, query, text_fn=lambda x: x)
        return [r.item for r in ranked]

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

# ============================================================
# modules/m2_research_accel/paper_parser.py
# GENESIS M2 — Research Paper Parser
#
# Extracts structured information from academic papers:
# title, authors, abstract, sections, references, key claims.
# Works with PDF paths, URLs, or raw text.
# ============================================================
from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine


@dataclass
class Paper:
    title:       str
    authors:     list[str]
    abstract:    str
    year:        Optional[str]
    venue:       Optional[str]          # journal / conference
    sections:    list[dict]             # [{"heading": str, "text": str}]
    references:  list[str]
    key_claims:  list[str]
    methodology: str
    results:     str
    source:      str

    @property
    def short_summary(self) -> str:
        return f"{self.title} ({self.year or 'n.d.'}) — {self.abstract[:200]}…"


class PaperParser:
    """
    Parses academic papers from text, URL, or PDF.
    Uses GemmaEngine for structured extraction.
    """

    _PARSE_PROMPT = """\
Parse this academic paper and return ONLY valid JSON (no markdown fences):
{{
  "title":       "full paper title",
  "authors":     ["Author One", "Author Two"],
  "year":        "2024",
  "venue":       "NeurIPS / arXiv / Nature / etc.",
  "abstract":    "full abstract text",
  "key_claims":  ["claim 1", "claim 2", "claim 3"],
  "methodology": "brief description of method",
  "results":     "main quantitative or qualitative results",
  "references":  ["Ref 1", "Ref 2"]
}}

Paper text:
{text}
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def parse_text(self, text: str, source: str = "raw") -> Paper:
        """Parse a paper from raw text."""
        truncated = text[:6000]
        print(f"   [PaperParser] Parsing {len(text)} chars from {source}...")

        raw = self.engine.think_json(
            self._PARSE_PROMPT.format(text=truncated),
            temperature=0.1, max_tokens=2048,
        )

        data = self._safe_json(raw)
        sections = self._extract_sections(text)

        return Paper(
            title       = data.get("title", "Unknown Title"),
            authors     = data.get("authors", []),
            abstract    = data.get("abstract", ""),
            year        = data.get("year"),
            venue       = data.get("venue"),
            sections    = sections,
            references  = data.get("references", []),
            key_claims  = data.get("key_claims", []),
            methodology = data.get("methodology", ""),
            results     = data.get("results", ""),
            source      = source,
        )

    def parse_url(self, url: str) -> Paper:
        from modules.m1_self_learner.ingestion import Ingestion
        text = Ingestion.from_url(url, max_chars=8000)
        return self.parse_text(text, source=url)

    def parse_pdf(self, pdf_path: str) -> Paper:
        from modules.m1_self_learner.ingestion import Ingestion
        text = Ingestion.from_pdf(pdf_path, max_chars=10000)
        return self.parse_text(text, source=pdf_path)

    # ── private ───────────────────────────────────────────

    @staticmethod
    def _extract_sections(text: str) -> list[dict]:
        """Heuristic section splitter — looks for heading patterns."""
        pattern = re.compile(
            r"^(\d+\.?\s+[A-Z][^\n]{3,60}|[A-Z][A-Z\s]{4,40})$",
            re.MULTILINE,
        )
        headings = [(m.start(), m.group(0).strip()) for m in pattern.finditer(text)]
        sections = []
        for i, (pos, heading) in enumerate(headings):
            end = headings[i + 1][0] if i + 1 < len(headings) else len(text)
            body = text[pos + len(heading):end].strip()[:1000]
            sections.append({"heading": heading, "text": body})
        return sections

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re as re_
        clean = re_.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

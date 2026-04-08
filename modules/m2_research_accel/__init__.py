# ============================================================
# modules/m2_research_accel/__init__.py
# GENESIS M2 — Research Accelerator
#
# Usage:
#   from modules.m2_research_accel import M2
#   m2 = M2(engine, kg)
#   paper = m2.parse("https://arxiv.org/abs/...")
#   hyps  = m2.hypotheses("transformer attention", n=3)
#   conns = m2.connections()
#   top   = m2.rank(texts, query="attention mechanisms")
# ============================================================
from __future__ import annotations
from modules.base_module import BaseModule
from modules.m2_research_accel.paper_parser     import PaperParser, Paper
from modules.m2_research_accel.hypothesis_gen   import HypothesisGenerator, Hypothesis
from modules.m2_research_accel.connection_finder import ConnectionFinder, Connection
from modules.m2_research_accel.ranker           import Ranker, RankedItem
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class M2(BaseModule):
    """GENESIS M2 — Research Accelerator."""

    MODULE_NAME = "m2_research_accel"

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        super().__init__(engine, kg)
        self.parser  = PaperParser(engine)
        self.hyp_gen = HypothesisGenerator(engine, kg)
        self.conn    = ConnectionFinder(engine, kg)
        self.ranker  = Ranker(engine)
        print("[M2] Research Accelerator ready — Parser • HypGen • Connections • Ranker")

    # ── main router entry point (called by Router) ─────────

    def run(self, query: str) -> str:
        q = query.lower()
        if any(k in q for k in ["parse", "paper", "read", "arxiv"]):
            # Extract URL or path from query
            import re
            url = re.search(r"https?://\S+", query)
            if url:
                paper = self.parse(url.group(0))
                return paper.short_summary
        if "connect" in q:
            return self.connections()
        if "rank" in q:
            return "Use m2.rank(texts, query) directly."
        return self.hypotheses(query)

    # ── public API ─────────────────────────────────────────

    def parse(self, source: str) -> Paper:
        """Parse a paper from URL, PDF path, or raw text."""
        if source.startswith("http"):
            return self.parser.parse_url(source)
        import os
        if os.path.isfile(source):
            return self.parser.parse_pdf(source)
        return self.parser.parse_text(source)

    def hypotheses(self, topic: str, n: int = 3,
                   extra_context: str = "") -> str:
        """Generate and format hypotheses about a topic."""
        hyps = self.hyp_gen.generate(topic, n, extra_context)
        return self.hyp_gen.format_all(hyps)

    def connections(self, query: str = "everything", n: int = 5) -> str:
        """Find cross-domain connections in stored knowledge."""
        conns = self.conn.find(query, n)
        return self.conn.format_all(conns)

    def rank(self, texts: list[str], query: str) -> list[str]:
        """Rank a list of texts by relevance/novelty/impact to query."""
        return self.ranker.rank_texts(texts, query)

    def learn_paper(self, source: str) -> dict:
        """Parse a paper AND store it in M1's KnowledgeGraph."""
        paper = self.parse(source)
        text  = (
            f"PAPER: {paper.title}\n"
            f"AUTHORS: {', '.join(paper.authors)}\n"
            f"ABSTRACT: {paper.abstract}\n"
            f"METHODOLOGY: {paper.methodology}\n"
            f"RESULTS: {paper.results}\n"
            f"KEY CLAIMS: {' | '.join(paper.key_claims)}"
        )
        doc_id = self.kg.store(
            "knowledge", text,
            metadata={"source": paper.source, "type": "paper",
                      "title": paper.title, "year": paper.year or ""},
        )
        return {"paper": paper.title, "doc_id": doc_id,
                "claims": len(paper.key_claims)}


__all__ = [
    "M2", "PaperParser", "Paper",
    "HypothesisGenerator", "Hypothesis",
    "ConnectionFinder", "Connection",
    "Ranker", "RankedItem",
]

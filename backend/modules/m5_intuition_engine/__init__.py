# modules/m5_intuition_engine/__init__.py — GENESIS M5
from __future__ import annotations
from modules.base_module import BaseModule
from modules.m5_intuition_engine.bayesian_reasoner import BayesianReasoner, BeliefUpdate
from modules.m5_intuition_engine.gap_filler        import GapFiller, FilledGap
from modules.m5_intuition_engine.cross_module_glue import CrossModuleGlue
from modules.m5_intuition_engine.explainer         import Explainer
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class M5(BaseModule):
    """GENESIS M5 — Intuition Engine: Bayesian • GapFill • CrossModule • Explain."""

    MODULE_NAME = "m5_intuition_engine"

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        super().__init__(engine, kg)
        self.bayes    = BayesianReasoner(engine, kg)
        self.filler   = GapFiller(engine, kg)
        self.glue     = CrossModuleGlue(engine, kg)
        self.explainer = Explainer(engine)
        print("[M5] Intuition Engine ready — Bayes • GapFill • CrossModule • Explainer")

    def run(self, query: str) -> str:
        q = query.lower()
        if "probability" in q or "likely" in q or "chance" in q:
            belief = self.bayes.update_belief(query)
            return (
                f"Claim: {belief.claim}\n"
                f"Probability: {belief.posterior:.0%} ({belief.confidence} confidence)\n"
                f"Reasoning: {belief.reasoning}"
            )
        if "gap" in q or "missing" in q:
            gaps = self.filler.fill_all_gaps(query)
            return "\n\n".join(
                f"[{g.confidence}] {g.gap_description}:\n{g.inferred_content}"
                for g in gaps
            )
        return self.glue.cross_kg_insight(query)

    def probability_of(self, claim: str, prior: float = 0.5) -> BeliefUpdate:
        return self.bayes.update_belief(claim, prior=prior)

    def fill_gaps(self, topic: str) -> list[FilledGap]:
        return self.filler.fill_all_gaps(topic)

    def cross_insight(self, query: str) -> str:
        return self.glue.cross_kg_insight(query)

    def synthesise(self, module_outputs: dict) -> str:
        return self.glue.synthesise(module_outputs)

    def explain(self, concept: str) -> str:
        return self.explainer.explain_with_analogy(concept)


__all__ = ["M5", "BayesianReasoner", "BeliefUpdate", "GapFiller",
           "FilledGap", "CrossModuleGlue", "Explainer"]

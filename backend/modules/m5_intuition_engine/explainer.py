# ============================================================
# modules/m5_intuition_engine/explainer.py
# GENESIS M5 — Intuition Explainer
#
# Makes complex inferences and probabilities human-understandable
# through analogies, narratives, and visual metaphors.
# ============================================================
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m5_intuition_engine.bayesian_reasoner import BeliefUpdate


class Explainer:
    """Turn complex probabilistic or cross-domain insights into plain language."""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def explain_belief(self, belief: BeliefUpdate) -> str:
        """Explain a Bayesian belief update in plain language."""
        return self.engine.think(
            prompt=(
                f"Explain this probability update to a non-expert:\n"
                f"Claim: {belief.claim}\n"
                f"Before: {belief.prior:.0%} → After: {belief.posterior:.0%}\n"
                f"Reasoning: {belief.reasoning}\n\n"
                "Use an analogy or story. Keep it under 100 words."
            ),
            temperature=0.6,
            max_tokens=200,
        )

    def explain_with_analogy(self, concept: str, audience: str = "general") -> str:
        """Explain a complex concept using a powerful analogy."""
        return self.engine.think(
            prompt=f"Explain '{concept}' to a {audience} audience using one powerful analogy.",
            system_prompt=(
                "You are a master explainer — like Richard Feynman. "
                "Use concrete, memorable analogies. Never use jargon without explaining it."
            ),
            temperature=0.7,
            max_tokens=400,
        )

    def narrative(self, insight: str) -> str:
        """Wrap an insight in a compelling narrative."""
        return self.engine.think(
            prompt=f"Turn this insight into a compelling 3-paragraph narrative:\n{insight}",
            temperature=0.75,
            max_tokens=600,
        )

# Wire M5 __init__.py

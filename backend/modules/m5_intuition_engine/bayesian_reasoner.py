# ============================================================
# modules/m5_intuition_engine/bayesian_reasoner.py
# GENESIS M5 — Bayesian Reasoner
#
# Estimates probabilities and updates beliefs using
# Bayesian reasoning guided by Gemma.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


@dataclass
class BeliefUpdate:
    claim:          str
    prior:          float       # 0.0–1.0 initial probability
    posterior:      float       # 0.0–1.0 after evidence
    evidence_used:  list[str]
    reasoning:      str
    confidence:     str         # high / medium / low


class BayesianReasoner:
    """Estimate and update probabilities using evidence from the KG."""

    _PROMPT = """\
Apply Bayesian reasoning to evaluate this claim:
"{claim}"

Prior probability estimate: {prior}

Evidence from knowledge base:
{evidence}

New information:
{new_info}

Return ONLY valid JSON:
{{
  "posterior":      0.75,
  "evidence_used":  ["fact 1", "fact 2"],
  "reasoning":      "step-by-step bayesian update explanation",
  "confidence":     "high|medium|low"
}}
"""

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        self.engine = engine
        self.kg     = kg

    def update_belief(
        self,
        claim: str,
        new_info: str = "",
        prior: float = 0.5,
    ) -> BeliefUpdate:
        """Update the probability of a claim given new evidence."""
        chunks   = self.kg.search("knowledge", claim, n_results=5)
        evidence = "\n".join(f"• {c[:200]}" for c in chunks) or "No prior evidence."

        raw  = self.engine.think_json(
            self._PROMPT.format(
                claim=claim, prior=prior,
                evidence=evidence, new_info=new_info or "None provided",
            ),
            temperature=0.2, max_tokens=1024,
        )
        data = self._safe_json(raw)
        return BeliefUpdate(
            claim         = claim,
            prior         = prior,
            posterior     = float(data.get("posterior", prior)),
            evidence_used = data.get("evidence_used", []),
            reasoning     = data.get("reasoning", ""),
            confidence    = data.get("confidence", "medium"),
        )

    def probability_of(self, claim: str) -> float:
        """Quick estimate — returns just the posterior float."""
        return self.update_belief(claim).posterior

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

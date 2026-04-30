# ============================================================
# modules/m6_reality_sim/results_analyzer.py
# GENESIS M6 — Results Analyzer
#
# Analyses simulation results, compares scenarios,
# and extracts actionable insights.
# ============================================================
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m6_reality_sim.sim_runner import SimulationResult


class ResultsAnalyzer:
    """Analyse and compare simulation results."""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def analyse(self, result: SimulationResult) -> str:
        """Deep analysis of a single simulation result."""
        return self.engine.think(
            prompt=(
                f"Analyse this simulation:\n{result.format()}\n\n"
                "Provide:\n"
                "1. Root cause analysis\n"
                "2. Most critical decision points\n"
                "3. Alternative outcomes if key decisions differed\n"
                "4. Actionable recommendations\n"
                "5. Confidence in this simulation (1-10)"
            ),
            temperature=0.4,
            max_tokens=1500,
        )

    def compare(self, results: list[SimulationResult]) -> str:
        """Compare multiple simulation scenarios side-by-side."""
        if not results:
            return "No simulation results to compare."
        summaries = "\n\n".join(
            f"[Scenario {i+1}: {r.scenario}]\n{r.format()}"
            for i, r in enumerate(results)
        )
        return self.engine.think(
            prompt=(
                f"Compare these {len(results)} simulation scenarios:\n\n"
                f"{summaries}\n\n"
                "Which scenario is most likely? Most dangerous? "
                "What do they all have in common? What's the best strategy?"
            ),
            temperature=0.5,
            max_tokens=1500,
        )

    def extract_actions(self, result: SimulationResult) -> list[str]:
        """Extract concrete action items from a simulation result."""
        raw = self.engine.think(
            prompt=(
                f"From this simulation: {result.conclusion}\n"
                f"Risk: {result.risk_level}\n\n"
                "List 5 concrete, actionable steps to take RIGHT NOW. "
                "Format as JSON array of strings."
            ),
            temperature=0.3,
            max_tokens=500,
        )
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        match = re.search(r"\[.*\]", clean, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        return [line.strip("- •").strip() for line in raw.splitlines() if line.strip()]

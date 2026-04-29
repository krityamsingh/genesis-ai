# modules/m6_reality_sim/__init__.py — GENESIS M6
from __future__ import annotations
from modules.base_module import BaseModule
from modules.m6_reality_sim.world_observer    import WorldObserver, WorldSnapshot
from modules.m6_reality_sim.sim_runner        import SimRunner, SimulationResult
from modules.m6_reality_sim.results_analyzer  import ResultsAnalyzer
from modules.m6_reality_sim.code_synthesizer  import CodeSynthesizer
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class M6(BaseModule):
    """GENESIS M6 — Reality Sim: observe → simulate → analyse → code."""

    MODULE_NAME = "m6_reality_sim"

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        super().__init__(engine, kg)
        self.observer  = WorldObserver(engine, kg)
        self.runner    = SimRunner(engine)
        self.analyzer  = ResultsAnalyzer(engine)
        self.coder     = CodeSynthesizer(engine)
        print("[M6] Reality Sim ready — Observer • Runner • Analyzer • CodeSynth")

    def run(self, query: str) -> str:
        """Quick simulate: observe query topic, run 3-step scenario."""
        snapshot = self.observer.observe(query)
        result   = self.runner.run(snapshot, scenario=query, n_steps=3)
        return result.format()

    def simulate(self, topic: str, scenario: str, n_steps: int = 5) -> SimulationResult:
        snapshot = self.observer.observe(topic)
        return self.runner.run(snapshot, scenario, n_steps)

    def what_if(self, topic: str, scenario: str) -> str:
        result = self.simulate(topic, scenario, n_steps=5)
        analysis = self.analyzer.analyse(result)
        return result.format() + "\n\n---\nANALYSIS:\n" + analysis

    def generate_sim_code(self, topic: str, scenario: str) -> str:
        snapshot = self.observer.observe(topic)
        return self.coder.synthesize(snapshot, scenario)


__all__ = ["M6", "WorldObserver", "WorldSnapshot", "SimRunner",
           "SimulationResult", "ResultsAnalyzer", "CodeSynthesizer"]

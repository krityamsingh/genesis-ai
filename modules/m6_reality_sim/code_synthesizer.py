# ============================================================
# modules/m6_reality_sim/code_synthesizer.py
# GENESIS M6 — Simulation Code Synthesizer
#
# Generates runnable simulation code (Python/NumPy/SimPy)
# from a world snapshot and scenario description.
# ============================================================
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m6_reality_sim.world_observer import WorldSnapshot


class CodeSynthesizer:
    """Generate executable simulation code from scenarios."""

    _PROMPT = """\
Write a complete, runnable Python simulation for:

Topic: {topic}
Scenario: {scenario}

Initial state variables:
{state}

Requirements:
- Use NumPy for numerical simulation
- Run for {steps} time steps
- Print state at each step
- Plot results with matplotlib
- Include comments explaining each part

Output ONLY Python code, no explanation outside comments.
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def synthesize(
        self,
        snapshot: WorldSnapshot,
        scenario: str,
        steps: int = 100,
    ) -> str:
        """Generate simulation Python code."""
        state_str = "\n".join(f"{k}: {v}" for k, v in snapshot.state.items())
        return self.engine.code(
            problem=self._PROMPT.format(
                topic    = snapshot.topic,
                scenario = scenario,
                state    = state_str[:1000],
                steps    = steps,
            ),
            language="python",
            max_tokens=3000,
        )

    def synthesize_agent_sim(self, scenario: str, n_agents: int = 100) -> str:
        """Generate an agent-based simulation."""
        return self.engine.code(
            problem=(
                f"Write an agent-based simulation in Python for:\n{scenario}\n\n"
                f"Use {n_agents} agents. Each agent should have state, "
                "behaviour rules, and interact with neighbours. "
                "Use numpy arrays for efficiency. Plot the emergent behaviour."
            ),
            language="python",
            max_tokens=3000,
        )

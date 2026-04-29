# ============================================================
# modules/m6_reality_sim/sim_runner.py
# GENESIS M6 — Simulation Runner
#
# Runs "what-if" scenarios by stepping through a world model
# using LLM-guided state transitions.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m6_reality_sim.world_observer import WorldSnapshot


@dataclass
class SimulationStep:
    step:        int
    action:      str
    new_state:   dict
    outcome:     str
    probability: float     # 0-1 likelihood of this outcome


@dataclass
class SimulationResult:
    topic:        str
    scenario:     str
    steps:        list[SimulationStep]
    final_state:  dict
    conclusion:   str
    risk_level:   str      # low / medium / high / critical

    def format(self) -> str:
        lines = [
            f"🌍 Simulation: {self.topic}",
            f"📋 Scenario:   {self.scenario}",
            f"⚠️  Risk:       {self.risk_level}",
            "",
        ]
        for s in self.steps:
            lines.append(f"Step {s.step}: {s.action}")
            lines.append(f"  → {s.outcome}  (p={s.probability:.0%})")
        lines += ["", f"Conclusion: {self.conclusion}"]
        return "\n".join(lines)


class SimRunner:
    """Run LLM-guided what-if simulations from a WorldSnapshot."""

    _STEP_PROMPT = """\
Run a simulation step for scenario: "{scenario}"

Current world state:
{state}

Action taken at step {step}: {action}

Return ONLY valid JSON:
{{
  "new_state":   {{"var": "new value"}},
  "outcome":     "what happens as a result",
  "probability": 0.75,
  "next_action": "what happens next"
}}
"""

    _CONCLUDE_PROMPT = """\
Simulation of "{scenario}" complete.

Steps taken:
{steps_summary}

Final state:
{final_state}

Provide:
1. Overall conclusion
2. Risk level (low/medium/high/critical)
3. Key lessons

Return ONLY valid JSON:
{{
  "conclusion": "...",
  "risk_level": "medium",
  "lessons":    ["lesson1", "lesson2"]
}}
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def run(
        self,
        snapshot: WorldSnapshot,
        scenario: str,
        n_steps:  int = 5,
    ) -> SimulationResult:
        """Run a multi-step simulation from a world snapshot."""
        steps       = []
        state       = dict(snapshot.state)
        next_action = scenario

        for i in range(1, n_steps + 1):
            raw  = self.engine.think_json(
                self._STEP_PROMPT.format(
                    scenario=scenario,
                    state=str(state)[:1000],
                    step=i,
                    action=next_action,
                ),
                temperature=0.6, max_tokens=512,
            )
            data = self._safe_json(raw)
            state.update(data.get("new_state", {}))
            step = SimulationStep(
                step        = i,
                action      = next_action,
                new_state   = dict(state),
                outcome     = data.get("outcome", ""),
                probability = float(data.get("probability", 0.5)),
            )
            steps.append(step)
            next_action = data.get("next_action", "Continue scenario")

        steps_summary = "\n".join(f"{s.step}. {s.action} → {s.outcome}" for s in steps)
        raw2 = self.engine.think_json(
            self._CONCLUDE_PROMPT.format(
                scenario=scenario,
                steps_summary=steps_summary,
                final_state=str(state)[:500],
            ),
            temperature=0.3, max_tokens=512,
        )
        concl = self._safe_json(raw2)

        return SimulationResult(
            topic       = snapshot.topic,
            scenario    = scenario,
            steps       = steps,
            final_state = state,
            conclusion  = concl.get("conclusion", ""),
            risk_level  = concl.get("risk_level", "medium"),
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

# ============================================================
# modules/m3_ai_builder/problem_parser.py
# GENESIS M3 — Problem Parser
#
# Converts a natural-language problem description into a
# structured spec: type, inputs/outputs, constraints, eval metric.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine


@dataclass
class ProblemSpec:
    problem_type:   str        # classification / regression / NLP / CV / RL / other
    task:           str        # one-line task description
    inputs:         list[str]  # input features / modalities
    outputs:        list[str]  # expected outputs
    constraints:    list[str]  # size, latency, interpretability, etc.
    eval_metric:    str        # accuracy / F1 / RMSE / BLEU / etc.
    dataset_hints:  list[str]  # suggested public datasets
    complexity:     str        # low / medium / high
    raw_description: str

    def to_prompt(self) -> str:
        return (
            f"Task: {self.task}\n"
            f"Type: {self.problem_type}\n"
            f"Inputs: {', '.join(self.inputs)}\n"
            f"Outputs: {', '.join(self.outputs)}\n"
            f"Constraints: {', '.join(self.constraints)}\n"
            f"Eval metric: {self.eval_metric}\n"
        )


class ProblemParser:
    """Parse an ML/AI problem description into a structured ProblemSpec."""

    _PROMPT = """\
Parse this AI/ML problem description into a structured spec.
Return ONLY valid JSON (no markdown):
{{
  "problem_type":   "classification|regression|NLP|CV|RL|other",
  "task":           "one-line task description",
  "inputs":         ["feature1", "feature2"],
  "outputs":        ["predicted_label"],
  "constraints":    ["latency < 100ms", "model < 100MB"],
  "eval_metric":    "accuracy|F1|RMSE|BLEU|etc.",
  "dataset_hints":  ["MNIST", "ImageNet"],
  "complexity":     "low|medium|high"
}}

Problem description:
{description}
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def parse(self, description: str) -> ProblemSpec:
        raw  = self.engine.think_json(
            self._PROMPT.format(description=description),
            temperature=0.1, max_tokens=1024,
        )
        data = self._safe_json(raw)
        return ProblemSpec(
            problem_type    = data.get("problem_type", "other"),
            task            = data.get("task", description[:100]),
            inputs          = data.get("inputs", []),
            outputs         = data.get("outputs", []),
            constraints     = data.get("constraints", []),
            eval_metric     = data.get("eval_metric", "accuracy"),
            dataset_hints   = data.get("dataset_hints", []),
            complexity      = data.get("complexity", "medium"),
            raw_description = description,
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

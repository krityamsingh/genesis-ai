# ============================================================
# modules/m3_ai_builder/arch_designer.py
# GENESIS M3 — Architecture Designer
#
# Recommends and describes an ML architecture for a given
# ProblemSpec. Outputs a full architecture description
# including model choice, layers, training strategy.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m3_ai_builder.problem_parser import ProblemSpec


@dataclass
class ArchitectureDesign:
    model_name:       str          # e.g. "BERT-base", "ResNet-50", "Custom MLP"
    framework:        str          # PyTorch / TensorFlow / JAX / sklearn
    layers:           list[dict]   # [{"name": "Embedding", "params": {...}}]
    training_strategy: str         # optimizer, lr schedule, batch size
    estimated_params: str          # "~110M"
    rationale:        str
    code_skeleton:    str          # Python code outline

    def summary(self) -> str:
        return (
            f"Architecture: {self.model_name} ({self.framework})\n"
            f"Params: {self.estimated_params}\n"
            f"Training: {self.training_strategy}\n"
            f"Rationale: {self.rationale}"
        )


class ArchDesigner:
    """Design an ML architecture from a ProblemSpec."""

    _PROMPT = """\
Design an optimal ML architecture for this problem spec:
{spec}

Return ONLY valid JSON:
{{
  "model_name":       "descriptive name",
  "framework":        "PyTorch|TensorFlow|JAX|sklearn",
  "layers": [
    {{"name": "Input", "params": {{"shape": [28, 28]}}}},
    {{"name": "Conv2d", "params": {{"out_channels": 32, "kernel_size": 3}}}}
  ],
  "training_strategy": "AdamW lr=1e-4, cosine schedule, batch=32",
  "estimated_params":  "~25M",
  "rationale":         "why this architecture",
  "code_skeleton":     "class Model(nn.Module):\\n    def __init__(self):\\n        super().__init__()\\n        # layers here"
}}
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def design(self, spec: ProblemSpec) -> ArchitectureDesign:
        raw  = self.engine.think_json(
            self._PROMPT.format(spec=spec.to_prompt()),
            temperature=0.3, max_tokens=2048,
        )
        data = self._safe_json(raw)
        return ArchitectureDesign(
            model_name        = data.get("model_name", "Custom Model"),
            framework         = data.get("framework", "PyTorch"),
            layers            = data.get("layers", []),
            training_strategy = data.get("training_strategy", ""),
            estimated_params  = data.get("estimated_params", "unknown"),
            rationale         = data.get("rationale", ""),
            code_skeleton     = data.get("code_skeleton", ""),
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

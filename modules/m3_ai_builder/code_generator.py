# ============================================================
# modules/m3_ai_builder/code_generator.py
# GENESIS M3 — Code Generator
#
# Generates full, runnable ML training/inference code
# from a ProblemSpec + ArchitectureDesign.
# ============================================================
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m3_ai_builder.problem_parser import ProblemSpec
from modules.m3_ai_builder.arch_designer  import ArchitectureDesign


class CodeGenerator:
    """Generate complete Python ML code from spec + architecture."""

    _PROMPT = """\
Generate complete, runnable Python code for this ML problem.

Problem spec:
{spec}

Architecture:
{arch}

Requirements:
- Use {framework}
- Include: data loading, model definition, training loop, evaluation
- Add type hints and docstrings
- Make it production-quality, not tutorial-level
- Handle train/val/test split
- Save best checkpoint

Output ONLY the Python code, no explanation outside comments.
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def generate(
        self,
        spec: ProblemSpec,
        arch: ArchitectureDesign,
        language: str = "python",
    ) -> str:
        """Generate full training code."""
        return self.engine.code(
            problem=self._PROMPT.format(
                spec=spec.to_prompt(),
                arch=arch.summary(),
                framework=arch.framework,
            ),
            language=language,
            max_tokens=4096,
        )

    def generate_inference(self, spec: ProblemSpec,
                           arch: ArchitectureDesign) -> str:
        """Generate inference/serving code."""
        prompt = (
            f"Write a FastAPI inference endpoint for this model:\n"
            f"{arch.summary()}\n\n"
            f"Problem: {spec.task}\n"
            f"Inputs: {spec.inputs}\n"
            f"Outputs: {spec.outputs}\n\n"
            "Include: model loading, preprocessing, prediction, health check."
        )
        return self.engine.code(prompt, language="python", max_tokens=2048)

    def generate_tests(self, spec: ProblemSpec) -> str:
        """Generate pytest test suite for the model."""
        prompt = (
            f"Write a pytest test suite for an ML model solving:\n"
            f"{spec.task}\n"
            f"Inputs: {spec.inputs}, Outputs: {spec.outputs}\n"
            f"Metric: {spec.eval_metric}\n\n"
            "Include: unit tests, integration tests, data validation tests."
        )
        return self.engine.code(prompt, language="python", max_tokens=2048)

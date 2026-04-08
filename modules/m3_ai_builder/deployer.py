# ============================================================
# modules/m3_ai_builder/deployer.py
# GENESIS M3 — Deployment Advisor
#
# Generates deployment configs and instructions for trained models.
# ============================================================
from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
from modules.m3_ai_builder.arch_designer import ArchitectureDesign


@dataclass
class DeploymentPlan:
    target:          str   # local / docker / cloud-run / k8s / huggingface
    dockerfile:      str
    requirements:    list[str]
    env_vars:        dict
    scaling_notes:   str
    estimated_cost:  str

    def summary(self) -> str:
        return (
            f"Target: {self.target}\n"
            f"Requirements: {', '.join(self.requirements)}\n"
            f"Scaling: {self.scaling_notes}\n"
            f"Cost estimate: {self.estimated_cost}"
        )


class Deployer:
    """Generate deployment plans and configs for ML models."""

    _PROMPT = """\
Create a deployment plan for this ML model:
{arch_summary}

Target platform: {target}

Return ONLY valid JSON:
{{
  "dockerfile":     "FROM python:3.11-slim\\nWORKDIR /app\\n...",
  "requirements":   ["torch==2.2.0", "fastapi>=0.110.0"],
  "env_vars":       {{"MODEL_PATH": "/models/best.pt", "BATCH_SIZE": "32"}},
  "scaling_notes":  "Use GPU for inference; horizontal scaling via k8s HPA",
  "estimated_cost": "$50-200/month on GCP Cloud Run"
}}
"""

    def __init__(self, engine: "GemmaEngine"):
        self.engine = engine

    def plan(self, arch: ArchitectureDesign,
             target: str = "docker") -> DeploymentPlan:
        raw  = self.engine.think_json(
            self._PROMPT.format(arch_summary=arch.summary(), target=target),
            temperature=0.2, max_tokens=2048,
        )
        data = self._safe_json(raw)
        return DeploymentPlan(
            target         = target,
            dockerfile     = data.get("dockerfile", ""),
            requirements   = data.get("requirements", []),
            env_vars       = data.get("env_vars", {}),
            scaling_notes  = data.get("scaling_notes", ""),
            estimated_cost = data.get("estimated_cost", "unknown"),
        )

    @staticmethod
    def _safe_json(raw: str) -> dict:
        import json, re
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        try:
            return json.loads(clean)
        except Exception:
            return {}

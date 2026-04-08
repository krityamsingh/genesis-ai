# modules/m3_ai_builder/__init__.py — GENESIS M3 AI Builder
from __future__ import annotations
from modules.base_module import BaseModule
from modules.m3_ai_builder.problem_parser  import ProblemParser, ProblemSpec
from modules.m3_ai_builder.arch_designer   import ArchDesigner, ArchitectureDesign
from modules.m3_ai_builder.code_generator  import CodeGenerator
from modules.m3_ai_builder.deployer        import Deployer, DeploymentPlan
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


class M3(BaseModule):
    """GENESIS M3 — AI Builder: parse → design → code → deploy."""

    MODULE_NAME = "m3_ai_builder"

    def __init__(self, engine: "GemmaEngine", kg: "KnowledgeGraph"):
        super().__init__(engine, kg)
        self.parser    = ProblemParser(engine)
        self.designer  = ArchDesigner(engine)
        self.coder     = CodeGenerator(engine)
        self.deployer  = Deployer(engine)
        print("[M3] AI Builder ready — Parser • Designer • CodeGen • Deployer")

    def run(self, query: str) -> str:
        """Quick pipeline: parse problem → design arch → return summary."""
        spec = self.parser.parse(query)
        arch = self.designer.design(spec)
        return (
            f"Problem: {spec.task}\n\n"
            f"Recommended Architecture:\n{arch.summary()}\n\n"
            f"Code skeleton:\n{arch.code_skeleton[:800]}"
        )

    def build(self, description: str) -> dict:
        """Full pipeline: parse → design → generate code."""
        spec = self.parser.parse(description)
        arch = self.designer.design(spec)
        code = self.coder.generate(spec, arch)
        return {
            "spec":  spec,
            "arch":  arch,
            "code":  code,
            "summary": arch.summary(),
        }

    def deploy(self, description: str, target: str = "docker") -> DeploymentPlan:
        spec = self.parser.parse(description)
        arch = self.designer.design(spec)
        return self.deployer.plan(arch, target)


__all__ = ["M3", "ProblemParser", "ProblemSpec", "ArchDesigner",
           "ArchitectureDesign", "CodeGenerator", "Deployer", "DeploymentPlan"]

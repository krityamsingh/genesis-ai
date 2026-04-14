# ============================================================
# modules/universal_coder/universal_coder.py
# GENESIS — Universal Coder
#
# The main brain for all code generation in Genesis.
# Connects the full pipeline:
#   P0 pre-gen → generation → 12-layer filter → self-heal
#
# Usage:
#   from modules.universal_coder import UniversalCoder
#   uc = UniversalCoder()
#   result = uc.process("Build a REST API for user login")
# ============================================================

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from core.caller         import call_ai, PROVIDER_GEMMA4, PROVIDER_OPENAI
from core.models         import PreGenResult, PipelineResult, HealResult
from core.pipeline       import run_pipeline
from core.heal           import self_heal
from core.pre_gen_pipeline import run_pre_generation

_GENERATE_PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts" / "generate.txt"

_FALLBACK_GENERATE_PROMPT = """You are an expert software engineer. Write complete, production-quality code.

TASK:
{task}

ARCHITECTURE PLAN:
{plan}

RESEARCH FINDINGS:
{research}

RULES:
- Write complete, runnable code — not pseudocode or stubs
- Include all imports at the top
- Add type hints and docstrings
- Handle errors properly with try/except where needed
- Follow the architecture plan exactly
- Output ONLY the code — no explanation outside of comments

CODE:"""


class UniversalCoder:
    """
    GENESIS Universal Coder.

    The single entry point for all code generation. Wraps
    the full pre-gen + generate + filter + heal pipeline.

    Args:
        default_provider: AI to use for code generation
                          (auto-selects specialist if registry match found)
    """

    def __init__(self, default_provider: str = PROVIDER_GEMMA4):
        self.default_provider = default_provider
        print("[UniversalCoder] Ready — pre-gen + 12-layer filter + self-heal")

    def process(
        self,
        task:              str,
        conversation:      list[dict] | None = None,
        use_public_research: bool            = False,
        skip_pre_gen:      bool              = False,
    ) -> dict:
        """
        Full pipeline: pre-gen → generate → filter → heal.

        Args:
            task:               The coding task description
            conversation:       Prior conversation turns
            use_public_research: Mode A (True) or Mode B (False)
            skip_pre_gen:       Skip P0 phase (for simple tasks)

        Returns:
            {
              "success":       bool,
              "code":          str,
              "plan":          str,
              "pipeline":      PipelineResult dict,
              "heal":          HealResult dict or None,
              "clarification": list[str] — questions if info missing,
              "status":        "clean"|"healed"|"escalated"|"needs_clarification"
            }
        """
        # ── Pre-generation phase ──────────────────────────
        pre_gen: Optional[PreGenResult] = None

        if not skip_pre_gen:
            pre_gen = run_pre_generation(
                task=task,
                conversation=conversation,
                use_public_research=use_public_research,
            )

            if pre_gen.needs_clarification:
                return {
                    "success":       False,
                    "code":          "",
                    "plan":          "",
                    "pipeline":      None,
                    "heal":          None,
                    "clarification": pre_gen.questions,
                    "status":        "needs_clarification",
                }

        # ── Code generation ───────────────────────────────
        plan     = pre_gen.architecture_plan if pre_gen else ""
        research = pre_gen.research_brief    if pre_gen else ""
        provider = (
            pre_gen.specialist_model
            if pre_gen and pre_gen.specialist_model
            else self.default_provider
        )

        code = self._generate_code(task, plan, research, provider)

        if not code or code.startswith("[CALLER ERROR]"):
            return {
                "success":       False,
                "code":          code or "",
                "plan":          plan,
                "pipeline":      None,
                "heal":          None,
                "clarification": [],
                "status":        "generation_failed",
            }

        # ── 12-layer filter ───────────────────────────────
        pipeline_result = run_pipeline(code=code, task=task)

        if pipeline_result.success:
            return {
                "success":       True,
                "code":          code,
                "plan":          plan,
                "pipeline":      pipeline_result.to_dict(),
                "heal":          None,
                "clarification": [],
                "status":        "clean",
            }

        # ── Layer 12 self-heal ────────────────────────────
        heal_result = self_heal(
            task=task,
            initial_code=code,
            initial_result=pipeline_result,
        )

        if heal_result.success:
            status = "healed"
        elif heal_result.escalated:
            status = "escalated"
        else:
            status = "failed"

        return {
            "success":       heal_result.success,
            "code":          heal_result.final_code,
            "plan":          plan,
            "pipeline":      pipeline_result.to_dict(),
            "heal":          {
                "success":    heal_result.success,
                "attempts":   heal_result.attempts,
                "escalated":  heal_result.escalated,
                "repair_log": heal_result.repair_log,
            },
            "clarification": [],
            "status":        status,
        }

    def quick_generate(self, task: str) -> str:
        """
        Fast path — skips pre-gen, runs full pipeline.
        Returns the final code string directly.
        """
        result = self.process(task=task, skip_pre_gen=True)
        return result.get("code", "")

    def _generate_code(
        self,
        task:     str,
        plan:     str,
        research: str,
        provider: str,
    ) -> str:
        """Build the generation prompt and call the AI."""
        try:
            if _GENERATE_PROMPT_PATH.exists():
                template = _GENERATE_PROMPT_PATH.read_text(encoding="utf-8")
                prompt = (
                    template
                    .replace("{task}",     task)
                    .replace("{plan}",     plan or "No plan provided.")
                    .replace("{research}", research or "No research available.")
                )
            else:
                prompt = _FALLBACK_GENERATE_PROMPT.format(
                    task=task,
                    plan=plan or "No plan provided.",
                    research=research or "No research available.",
                )
        except Exception:
            prompt = _FALLBACK_GENERATE_PROMPT.format(
                task=task,
                plan=plan or "No plan provided.",
                research=research or "No research available.",
            )

        raw = call_ai(
            prompt=prompt,
            provider=provider,
            temperature=0.1,
            max_tokens=4096,
        )

        return _clean_code_fences(raw)

    def __repr__(self) -> str:
        return f"<UniversalCoder provider={self.default_provider}>"


def _clean_code_fences(text: str) -> str:
    import re
    clean = re.sub(r"```(?:\w+)?", "", text).strip()
    return clean.rstrip("`").strip()

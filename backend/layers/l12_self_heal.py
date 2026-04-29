# ============================================================
# layers/l12_self_heal.py
# GENESIS Layer 12 — Self-Heal Router
#
# This layer does NOT check code.
# It routes failed code to the correct AI for repair
# based on which attempt number this is.
#
# Attempt 1 → GPT-4o
# Attempt 2 → Grok
# Attempt 3 → Gemini
#
# The actual healing logic lives in core/heal.py.
# This file provides the layer-compatible run() interface.
# ============================================================

from __future__ import annotations
from core.caller import call_ai, get_heal_provider
from core.models import LayerFailure


def run(
    code:    str,
    task:    str,
    provider: str,
    attempt:  int = 1,
) -> list[LayerFailure]:
    """
    Layer 12 run interface.
    When called from pipeline.py this is a no-op — L12 is
    triggered by core/heal.py, not the pipeline runner.

    This function is exposed for direct use when you want
    to run a single heal attempt on specific failures.

    Args:
        code:     The code to repair
        task:     Original task description
        provider: Override provider (normally auto-selected by attempt)
        attempt:  Which attempt number (1=GPT-4o, 2=Grok, 3=Gemini)

    Returns:
        Empty list — healing success/failure is tracked in HealResult,
        not as LayerFailure instances.
    """
    return []


def heal_single_attempt(
    task:     str,
    bad_code: str,
    failures: list[LayerFailure],
    attempt:  int,
) -> str:
    """
    Run one heal attempt using the rotation-appropriate AI.

    Returns the fixed code string, or the original code if
    the AI call failed.
    """
    from core.heal import build_heal_prompt, _clean_code_fences

    provider      = get_heal_provider(attempt)
    repair_prompt = build_heal_prompt(
        task=task,
        bad_code=bad_code,
        failures=failures,
        attempt=attempt,
    )

    result = call_ai(
        prompt=repair_prompt,
        provider=provider,
        temperature=0.1,
        max_tokens=4096,
    )

    if result.startswith("[CALLER ERROR]"):
        return bad_code

    return _clean_code_fences(result)

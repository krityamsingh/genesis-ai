# ============================================================
# core/heal.py
# GENESIS — Layer 12 Self-Heal Loop
#
# When the pipeline detects failures, this module:
#   1. Builds a surgical repair prompt with exact failure info
#   2. Sends to GPT-4o (attempt 1)
#   3. If still failing → Grok (attempt 2)
#   4. If still failing → Gemini (attempt 3)
#   5. After each fix, re-runs the full pipeline from L1
#   6. Escalates if all 3 attempts fail
#
# Usage:
#   from core.heal import self_heal
#   result = self_heal(task="...", initial_code="...",
#                      initial_result=pipeline_result)
# ============================================================

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from core.caller   import call_ai, get_heal_provider, PROVIDER_OPENAI
from core.models   import PipelineResult, HealResult, LayerFailure
from core.pipeline import run_pipeline

MAX_HEAL_ATTEMPTS = int(os.getenv("HEAL_MAX_ATTEMPTS", "3"))
HEAL_TEMPERATURE  = 0.1

_HEAL_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "heal.txt"


def self_heal(
    task:           str,
    initial_code:   str,
    initial_result: PipelineResult,
) -> HealResult:
    """
    Attempt to self-heal code that failed the pipeline.

    Args:
        task:           The original user task description
        initial_code:   The code that failed
        initial_result: PipelineResult with the failures

    Returns:
        HealResult with success status, final code, and repair log
    """
    code        = initial_code
    result      = initial_result
    repair_log  = []

    for attempt in range(1, MAX_HEAL_ATTEMPTS + 1):
        provider = get_heal_provider(attempt)

        repair_prompt = build_heal_prompt(
            task=task,
            bad_code=code,
            failures=result.failures,
            attempt=attempt,
        )

        log_entry = {
            "attempt":   attempt,
            "provider":  provider,
            "failures":  [(f.layer_name, f.error_type) for f in result.failures],
            "code_before": code[:500],
        }

        fixed_code = call_ai(
            prompt=repair_prompt,
            provider=provider,
            temperature=HEAL_TEMPERATURE,
            max_tokens=4096,
        )

        if fixed_code.startswith("[CALLER ERROR]"):
            log_entry["outcome"] = f"provider_error: {fixed_code[:80]}"
            repair_log.append(log_entry)
            continue

        fixed_code = _clean_code_fences(fixed_code)
        log_entry["code_after"] = fixed_code[:500]

        new_result = run_pipeline(code=fixed_code, task=task)
        log_entry["outcome"]    = "pass" if new_result.success else f"still_failing({len(new_result.failures)})"
        repair_log.append(log_entry)

        code   = fixed_code
        result = new_result

        if new_result.success:
            return HealResult(
                success=True,
                final_code=fixed_code,
                attempts=attempt,
                repair_log=repair_log,
                escalated=False,
            )

    return HealResult(
        success=False,
        final_code=code,
        attempts=MAX_HEAL_ATTEMPTS,
        repair_log=repair_log,
        escalated=True,
    )


def build_heal_prompt(
    task:     str,
    bad_code: str,
    failures: list[LayerFailure],
    attempt:  int,
) -> str:
    """
    Build a surgical repair prompt for the healing AI.
    Uses prompts/heal.txt template if available,
    falls back to hardcoded template.
    """
    failure_block = _format_failures(failures)

    template = _load_heal_template()
    if template:
        return (
            template
            .replace("{attempt}",       str(attempt))
            .replace("{max_attempts}",  str(MAX_HEAL_ATTEMPTS))
            .replace("{task}",          task)
            .replace("{bad_code}",      bad_code)
            .replace("{failures}",      failure_block)
        )

    return f"""You are a code repair engine. This is repair attempt {attempt} of {MAX_HEAL_ATTEMPTS}.

ORIGINAL TASK:
{task}

CURRENT CODE (contains errors):
```
{bad_code}
```

FAILURES DETECTED:
{failure_block}

STRICT RULES:
1. Return ONLY the complete corrected code. No explanation. No markdown fences.
2. Fix ONLY the reported failures. Do not change anything else.
3. Keep the same structure, variable names, and logic for everything not in the failures list.
4. If fixing one failure requires changing something connected to it, fix both.

CORRECTED CODE:"""


def escalate(
    task:       str,
    final_code: str,
    repair_log: list[dict],
) -> str:
    """
    Called when all heal attempts are exhausted.
    Returns a formatted escalation report.
    """
    attempts_summary = []
    for entry in repair_log:
        attempts_summary.append(
            f"  Attempt {entry['attempt']} ({entry['provider']}): {entry['outcome']}"
        )

    return (
        f"[GENESIS ESCALATION] Auto-repair failed after {MAX_HEAL_ATTEMPTS} attempts.\n"
        f"Task: {task[:200]}\n"
        f"Attempts:\n" + "\n".join(attempts_summary) + "\n"
        f"The code requires manual review. Last version attached below.\n\n"
        f"LAST CODE:\n{final_code}"
    )


def _format_failures(failures: list[LayerFailure]) -> str:
    if not failures:
        return "No specific failures reported."

    lines = []
    for f in failures:
        line_info = f"lines {f.line_numbers}" if f.line_numbers else "unknown location"
        lines.append(
            f"- Layer {f.layer_id} ({f.layer_name}) | {f.error_type} | {line_info}\n"
            f"  Problem: {f.description}\n"
            f"  Broken code: {f.bad_snippet or 'see full code above'}\n"
            f"  Fix hint: {f.fix_hint or 'correct the reported issue'}"
        )
    return "\n\n".join(lines)


def _load_heal_template() -> Optional[str]:
    try:
        if _HEAL_PROMPT_PATH.exists():
            return _HEAL_PROMPT_PATH.read_text(encoding="utf-8")
    except Exception:
        pass
    return None


def _clean_code_fences(text: str) -> str:
    import re
    clean = re.sub(r"```(?:\w+)?", "", text).strip()
    return clean.rstrip("`").strip()

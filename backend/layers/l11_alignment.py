# ============================================================
# layers/l11_alignment.py
# GENESIS Layer 11 — Contextual Alignment Check
# Provider: GPT-4o (best instruction follower)
#
# Catches code that is technically perfect but solves
# the wrong problem.
# ============================================================
from __future__ import annotations
from pathlib import Path
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "layer_prompts" / "l11_alignment.txt"

_FALLBACK_PROMPT = """You are a requirements alignment checker.

ORIGINAL TASK:
{task}

GENERATED CODE:
{code}

Check:
1. Does the code fully implement everything the task asks for?
2. Are all required functions, classes, or features present?
3. Does the code handle all the specific requirements mentioned?
4. Is the correct language/framework used?
5. Are there any missing edge cases that were explicitly mentioned?

If the code correctly and completely solves the task respond with exactly: ALIGNED

If there are alignment issues respond in this exact format (one per line):
ALIGN|missing_feature|<description of what is missing or wrong>|<fix_hint>"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    try:
        if _PROMPT_PATH.exists():
            template = _PROMPT_PATH.read_text(encoding="utf-8")
            prompt = template.replace("{code}", code).replace("{task}", task)
        else:
            prompt = _FALLBACK_PROMPT.format(task=task, code=code)
    except Exception:
        prompt = _FALLBACK_PROMPT.format(task=task, code=code)

    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=600)

    if "ALIGNED" in response.upper() and "ALIGN|" not in response:
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("ALIGN|"):
            continue
        parts = line.split("|")
        if len(parts) < 4:
            continue
        _, error_type, description, hint = parts[:4]
        failures.append(LayerFailure(
            layer_id=11,
            layer_name="Alignment",
            error_type=error_type.strip(),
            description=description.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

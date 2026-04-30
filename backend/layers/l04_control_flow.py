# ============================================================
# layers/l04_control_flow.py
# GENESIS Layer 4 — Control Flow & Logic
# Provider: GPT-4o (best multi-step reasoning)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a control flow analyser. Build a mental control flow graph of the code below.

Check for:
- Infinite loops (loops with no reachable exit condition)
- Dead code (branches that can never execute)
- Missing return statements in non-void functions
- Boolean contradictions (conditions always true or always false)
- Unreachable code after return/break/continue
- Missing break in switch/match cases where needed

For each issue respond in this exact format (one per line):
FLOW|<line_number>|<error_type>|<description>|<bad_snippet>|<fix_hint>

If no control flow issues found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=900)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("FLOW|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, error_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=4,
            layer_name="Control Flow",
            error_type=error_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

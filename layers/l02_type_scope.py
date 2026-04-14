# ============================================================
# layers/l02_type_scope.py
# GENESIS Layer 2 — Type & Scope Safety
# Provider: Gemma 4 (free, local)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a static type and scope analyser. Check the code below.

Check for:
- Variables used before they are defined
- Type mismatches (passing wrong type to a function)
- Null/None/undefined dereference risks
- Variables used outside their declared scope
- Return type inconsistencies

For each issue respond in this exact format (one per line):
TYPE|<line_number>|<error_type>|<description>|<bad_snippet>|<fix_hint>

If no issues found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=800)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("TYPE|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, error_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=2,
            layer_name="Type & Scope",
            error_type=error_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

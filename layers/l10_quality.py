# ============================================================
# layers/l10_quality.py
# GENESIS Layer 10 — Code Quality & DRY Check
# Provider: Gemma 4 (free local lint-style check)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a code quality and maintainability checker.

Check for:
- DRY violations (copy-paste code blocks that should be extracted into functions)
- Functions longer than 50 lines (should be split)
- Deeply nested code (more than 4 levels of indentation)
- Poor variable or function naming (single letters, meaningless names like 'temp', 'data2')
- Missing error handling on operations that can fail (file I/O, network, parsing)
- Magic numbers (unexplained numeric literals — use named constants instead)
- Public functions/classes missing docstrings
- Commented-out code left in the output

For each issue respond in this exact format (one per line):
QUALITY|<line_number>|<issue_type>|<description>|<fix_hint>

issue_type options: dry_violation | function_too_long | deep_nesting |
poor_naming | missing_error_handling | magic_number | missing_docstring | dead_comment

If no quality issues found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=800)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("QUALITY|"):
            continue
        parts = line.split("|")
        if len(parts) < 5:
            continue
        _, line_num, issue_type, description, hint = parts[:5]
        failures.append(LayerFailure(
            layer_id=10,
            layer_name="Quality & DRY",
            error_type=issue_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            fix_hint=hint.strip(),
            severity="low",
        ))
    return failures

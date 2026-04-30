# ============================================================
# layers/l01_syntax.py
# GENESIS Layer 1 — Syntax & AST Parse
#
# Provider: Gemma 4 (free, local)
# Hard stop: YES — if this fails nothing else runs
#
# Checks: parse tree validity, bracket matching,
# token validity, indentation, string closure
# ============================================================

from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a syntax validation engine. Analyse the code below for syntax errors.

Check for:
- Unmatched brackets, parentheses, braces
- Unclosed string literals
- Invalid tokens or keywords
- Indentation errors
- Missing colons, semicolons where required by the language

For each error found respond in this exact format (one per line):
SYNTAX|<line_number>|<error_type>|<description>|<bad_snippet>

If no syntax errors found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    if not code.strip():
        return [LayerFailure(
            layer_id=1, layer_name="Syntax & AST",
            error_type="empty_code", description="Code is empty.",
            severity="critical",
        )]

    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=600)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("SYNTAX|"):
            continue
        parts = line.split("|")
        if len(parts) < 5:
            continue
        _, line_num, error_type, description, snippet = parts[:5]
        failures.append(LayerFailure(
            layer_id=1,
            layer_name="Syntax & AST",
            error_type=error_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint="Fix the syntax error before proceeding.",
            severity="critical",
        ))

    if not failures and "[CALLER ERROR]" in response:
        return [LayerFailure(
            layer_id=1, layer_name="Syntax & AST",
            error_type="layer_unavailable",
            description=f"Layer 1 could not run: {response[:80]}",
            severity="high",
        )]

    return failures

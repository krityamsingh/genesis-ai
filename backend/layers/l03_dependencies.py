# ============================================================
# layers/l03_dependencies.py
# GENESIS Layer 3 — Dependency & Import Check
# Provider: Gemini (broadest package ecosystem knowledge)
#
# KEY RULE (from Kiro, Cursor, Devin, Traycer — all 4 agree):
# NEVER assume a library is available, even if well known.
# Always verify the package exists and check the version.
# ============================================================
from __future__ import annotations
from pathlib import Path
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "layer_prompts" / "l03_deps.txt"

_FALLBACK_PROMPT = """You are a dependency and package validation engine.

CRITICAL RULE: NEVER assume a library is available, even if it is well known.
Every import must be verified as a real, installable package.

Check the code below for:
- Imports of packages that do not exist on PyPI / npm
- Incorrect package names (common typos or wrong names)
- Version incompatibilities between imported packages
- Circular import patterns
- Importing from a module that does not export the referenced symbol

For each issue respond in this exact format (one per line):
DEP|<line_number>|<error_type>|<description>|<bad_snippet>|<fix_hint>

If all dependencies are valid respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    try:
        if _PROMPT_PATH.exists():
            template = _PROMPT_PATH.read_text(encoding="utf-8")
            prompt = template.replace("{code}", code).replace("{task}", task)
        else:
            prompt = _FALLBACK_PROMPT.format(code=code)
    except Exception:
        prompt = _FALLBACK_PROMPT.format(code=code)

    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=800)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("DEP|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, error_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=3,
            layer_name="Dependencies",
            error_type=error_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

# ============================================================
# layers/l09_performance.py
# GENESIS Layer 9 — Performance Profiling
# Provider: Gemini (algorithmic analysis of large codebases)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a performance profiler and algorithmic complexity analyser.

Check for:
- O(n²) or worse nested loops where O(n log n) or O(n) is achievable
- N+1 query patterns (database query inside a loop)
- Memory leaks (objects allocated in loops but never freed)
- Redundant computation (same value calculated repeatedly inside loops)
- Inefficient data structures (list lookup O(n) where set/dict O(1) would work)
- Loading entire large datasets into memory when streaming is possible
- Missing pagination on database queries that could return unbounded results
- Synchronous blocking operations that should be async

For each issue found respond in this exact format (one per line):
PERF|<line_number>|<issue_type>|<description>|<current_complexity>|<fix_hint>

issue_type options: quadratic_loop | n_plus_1 | memory_leak | redundant_computation |
wrong_data_structure | unbounded_memory | missing_pagination | blocking_operation

If no performance issues found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=800)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("PERF|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, issue_type, description, complexity, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=9,
            layer_name="Performance",
            error_type=issue_type.strip(),
            description=f"{description.strip()} | Complexity: {complexity.strip()}",
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            fix_hint=hint.strip(),
            severity="medium",
        ))
    return failures

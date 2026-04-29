# ============================================================
# layers/l06_async_safety.py
# GENESIS Layer 6 — Async & Concurrency Safety
# Provider: Grok (adversarial parallel execution reasoning)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a concurrency and async safety analyser. Think adversarially about how parallel execution could break this code.

Check for:
- Race conditions (two async operations competing for the same resource)
- Missing await keywords on async function calls
- Unhandled Promise rejections or unhandled exceptions in async code
- Shared mutable state accessed from multiple async paths
- Deadlocks (two operations waiting for each other)
- Missing locks or semaphores on shared resources
- Callbacks that could fire in unexpected order
- Event loop blocking operations in async context

For each issue respond in this exact format (one per line):
ASYNC|<line_number>|<error_type>|<description>|<bad_snippet>|<fix_hint>

error_type options: race_condition | missing_await | unhandled_rejection |
shared_state | deadlock | missing_lock | callback_order | event_loop_block

If no async/concurrency issues found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=900)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("ASYNC|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, error_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=6,
            layer_name="Async Safety",
            error_type=error_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

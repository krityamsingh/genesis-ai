# ============================================================
# layers/l05_runtime_sim.py
# GENESIS Layer 5 — Runtime Simulation
# Provider: GPT-4o (best adversarial input reasoning)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a runtime crash simulator. Mentally execute the code with adversarial inputs.

Inject and trace these edge case inputs into every function entry point:
- null / None / undefined values
- Empty string ""
- Empty array [] or empty dict {{}}
- Zero (0) and negative numbers (-1, -999)
- Maximum integer values
- Very long strings (10,000+ chars)
- Invalid types (pass string where int expected)
- Floating point edge cases (0.0, inf, -inf, NaN)

For each crash or unexpected behaviour found respond in this exact format:
RUNTIME|<line_number>|<error_type>|<description>|<bad_snippet>|<fix_hint>

error_type options: null_dereference | division_by_zero | index_out_of_bounds | 
overflow | type_error | empty_collection | infinite_recursion | stack_overflow

If the code handles all edge cases correctly respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=900)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("RUNTIME|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, error_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=5,
            layer_name="Runtime Simulation",
            error_type=error_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

# ============================================================
# layers/l08_compliance.py
# GENESIS Layer 8 — Compliance & License Audit
# Provider: Gemini (broadest legal/regulatory knowledge)
# ============================================================
from __future__ import annotations
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT = """You are a compliance and license auditor for software code.

Check for:
- GDPR violations (storing PII without encryption, logging personal data)
- HIPAA violations (medical data handled insecurely)
- PII exposure (names, emails, phone numbers, SSNs in logs or plain text storage)
- Missing data encryption where sensitive data is stored or transmitted
- Open source license conflicts (GPL code mixed with proprietary MIT code)
- Use of deprecated or legally problematic APIs
- Missing required legal notices or attributions

For each issue found respond in this exact format (one per line):
COMPLY|<line_number>|<issue_type>|<description>|<bad_snippet>|<fix_hint>

issue_type options: gdpr_violation | hipaa_violation | pii_exposure |
missing_encryption | license_conflict | deprecated_api | missing_attribution

If no compliance issues found respond with exactly: CLEAN

CODE:
{code}"""


def run(code: str, task: str, provider: str) -> list[LayerFailure]:
    prompt   = _PROMPT.format(code=code)
    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=800)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("COMPLY|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, issue_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=8,
            layer_name="Compliance",
            error_type=issue_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="high",
        ))
    return failures

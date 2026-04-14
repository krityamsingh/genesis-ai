# ============================================================
# layers/l07_security.py
# GENESIS Layer 7 — Security Vulnerability Scan (SAST)
# Provider: Grok (adversarial attacker reasoning)
# Hard stop: YES — security failures block output immediately
# ============================================================
from __future__ import annotations
from pathlib import Path
from core.caller import call_ai
from core.models import LayerFailure

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "layer_prompts" / "l07_security.txt"

_FALLBACK_PROMPT = """You are a security vulnerability scanner. Think like an attacker trying to exploit this code.

Check for OWASP Top 10 and common vulnerabilities:
- SQL injection (user input directly in SQL queries)
- XSS — Cross-Site Scripting (unsanitised user input in HTML output)
- Command injection (user input passed to shell/exec commands)
- Path traversal (user input used in file paths)
- Hardcoded secrets, API keys, passwords, or tokens
- Insecure deserialization (pickle, yaml.load without Loader)
- Broken authentication patterns
- Sensitive data exposure (logging passwords, PII in plain text)
- SSRF — Server-Side Request Forgery
- Insecure direct object references

For each vulnerability found respond in this exact format (one per line):
VULN|<line_number>|<vuln_type>|<description>|<bad_snippet>|<fix_hint>

If no vulnerabilities found respond with exactly: CLEAN

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

    response = call_ai(prompt, provider=provider, temperature=0.0, max_tokens=1000)

    if response.strip().upper() == "CLEAN":
        return []

    failures = []
    for line in response.strip().splitlines():
        if not line.startswith("VULN|"):
            continue
        parts = line.split("|")
        if len(parts) < 6:
            continue
        _, line_num, vuln_type, description, snippet, hint = parts[:6]
        failures.append(LayerFailure(
            layer_id=7,
            layer_name="Security Scan",
            error_type=vuln_type.strip(),
            description=description.strip(),
            line_numbers=[int(line_num)] if line_num.strip().isdigit() else [],
            bad_snippet=snippet.strip(),
            fix_hint=hint.strip(),
            severity="critical",
        ))
    return failures

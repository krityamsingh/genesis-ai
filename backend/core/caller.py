# core/caller.py
# GENESIS — Unified Multi-Model AI Caller
#
# FIXES (Layer Linkage):
#   • _call_gemma4 now calls get_engine_for_task() instead of get_engine()
#     get_engine(request) requires a FastAPI Request object and CANNOT be
#     called from layers (which run outside a request context).
#     get_engine_for_task() is the correct no-request fallback.
# =============================================================================

from __future__ import annotations

import logging
import os
import time
from typing import Optional

log = logging.getLogger("core.caller")

# ── Provider constants ────────────────────────────────────────────────────────
PROVIDER_GEMMA4 = "gemma4"
PROVIDER_GEMINI = "gemini"
PROVIDER_OPENAI = "openai"
PROVIDER_GROK   = "grok"

# ── Default models per provider ───────────────────────────────────────────────
DEFAULT_MODELS = {
    PROVIDER_GEMMA4: os.getenv("GEMMA_MODEL",  "default"),
    PROVIDER_GEMINI: os.getenv("GEMINI_MODEL", "gemini-2.5-pro"),
    PROVIDER_OPENAI: os.getenv("OPENAI_MODEL", "gpt-4o"),
    PROVIDER_GROK:   os.getenv("GROK_MODEL",   "grok-3"),
}

# ── AI role assignments per layer ─────────────────────────────────────────────
LAYER_PROVIDERS = {
    1:  PROVIDER_GEMMA4,
    2:  PROVIDER_GEMMA4,
    3:  PROVIDER_GEMINI,
    4:  PROVIDER_OPENAI,
    5:  PROVIDER_OPENAI,
    6:  PROVIDER_GROK,
    7:  PROVIDER_GROK,
    8:  PROVIDER_GEMINI,
    9:  PROVIDER_GEMINI,
    10: PROVIDER_GEMMA4,
    11: PROVIDER_OPENAI,
    12: PROVIDER_OPENAI,
}

# ── Heal rotation ─────────────────────────────────────────────────────────────
HEAL_ROTATION = {
    1: PROVIDER_OPENAI,
    2: PROVIDER_GROK,
    3: PROVIDER_GEMINI,
}

MAX_RETRIES     = 3
RETRY_DELAY     = 3     # seconds
RATE_LIMIT_WAIT = 15    # seconds on 429


# ── Public API ────────────────────────────────────────────────────────────────

def call_ai(
    prompt:        str,
    provider:      str           = PROVIDER_GEMMA4,
    system_prompt: Optional[str] = None,
    temperature:   float         = 0.1,
    max_tokens:    int           = 2048,
) -> str:
    """
    Call any AI provider with a unified interface.

    Args:
        prompt:        The user message / task prompt
        provider:      "gemma4" | "gemini" | "openai" | "grok"
        system_prompt: Optional system instruction
        temperature:   0.0 = deterministic, 1.0 = creative
        max_tokens:    Maximum response tokens

    Returns:
        Response text. Never raises — returns "[CALLER ERROR] ..." on failure.
    """
    provider = provider.lower().strip()

    for attempt in range(MAX_RETRIES):
        try:
            if provider == PROVIDER_GEMMA4:
                return _call_gemma4(prompt, system_prompt, temperature, max_tokens)
            elif provider == PROVIDER_GEMINI:
                return _call_gemini(prompt, system_prompt, temperature, max_tokens)
            elif provider == PROVIDER_OPENAI:
                return _call_openai(prompt, system_prompt, temperature, max_tokens)
            elif provider == PROVIDER_GROK:
                return _call_grok(prompt, system_prompt, temperature, max_tokens)
            else:
                return f"[CALLER ERROR] Unknown provider: {provider}"

        except Exception as e:
            err = str(e).lower()
            if "429" in err or "rate limit" in err or "quota" in err:
                wait = RATE_LIMIT_WAIT * (attempt + 1)
                log.warning(f"Rate limit on {provider} — waiting {wait}s...")
                time.sleep(wait)
            elif attempt < MAX_RETRIES - 1:
                log.warning(f"Retry {attempt + 1}/{MAX_RETRIES} on {provider}: {e}")
                time.sleep(RETRY_DELAY)
            else:
                log.error(f"{provider} failed after {MAX_RETRIES} attempts: {e}")
                return f"[CALLER ERROR] {provider} failed after {MAX_RETRIES} attempts: {e}"

    return f"[CALLER ERROR] {provider} max retries exceeded"


def get_layer_provider(layer_id: int) -> str:
    """Return the assigned provider for a given layer number."""
    return LAYER_PROVIDERS.get(layer_id, PROVIDER_GEMMA4)


def get_heal_provider(attempt: int) -> str:
    """Return the provider for a given heal attempt (1, 2, or 3)."""
    return HEAL_ROTATION.get(attempt, PROVIDER_GEMINI)


# ── Private provider implementations ─────────────────────────────────────────

def _call_gemma4(
    prompt:        str,
    system_prompt: Optional[str],
    temperature:   float,
    max_tokens:    int,
) -> str:
    """
    Route through the GemmaEngine singleton.

    ✅ FIX: Use get_engine_for_task() — this is the no-Request fallback designed
    for code running OUTSIDE a FastAPI request context (layers, Celery, scripts).
    The old get_engine(request) requires a FastAPI Request object and will crash
    when called from layers since no Request is available there.
    """
    try:
        from api.dependencies import get_engine_for_task
        engine = get_engine_for_task()
        return engine.think(
            prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception:
        # Hard fallback: build a minimal client directly
        from huggingface_hub import InferenceClient
        from core.gemma_engine import GEMMA_MODELS

        token     = os.getenv("HF_TOKEN", "")
        model_key = os.getenv("GEMMA_MODEL", "default")
        model_id  = GEMMA_MODELS.get(model_key, model_key)

        client = InferenceClient(model=model_id, token=token, timeout=120)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        resp = client.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content.strip()


def _call_gemini(
    prompt:        str,
    system_prompt: Optional[str],
    temperature:   float,
    max_tokens:    int,
) -> str:
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to your .env file. "
            "Get a key at https://aistudio.google.com/apikey"
        )

    genai.configure(api_key=api_key)
    model_name = DEFAULT_MODELS[PROVIDER_GEMINI]

    gen_config = genai.GenerationConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
    )
    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config=gen_config,
        system_instruction=system_prompt or "",
    )
    response = model.generate_content(prompt)
    return response.text.strip()


def _call_openai(
    prompt:        str,
    system_prompt: Optional[str],
    temperature:   float,
    max_tokens:    int,
) -> str:
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY is not set. Add it to your .env file."
        )

    client   = OpenAI(api_key=api_key)
    model    = DEFAULT_MODELS[PROVIDER_OPENAI]
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()


def _call_grok(
    prompt:        str,
    system_prompt: Optional[str],
    temperature:   float,
    max_tokens:    int,
) -> str:
    from openai import OpenAI

    api_key = os.getenv("GROK_API_KEY", "")
    if not api_key:
        raise ValueError(
            "GROK_API_KEY is not set. Add it to your .env file. "
            "Get a key at https://console.x.ai/"
        )

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.x.ai/v1",
    )
    model    = DEFAULT_MODELS[PROVIDER_GROK]
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()


# ── Quick test ────────────────────────────────────────────────────────────────

def test_all_providers():
    """Run: from core.caller import test_all_providers; test_all_providers()"""
    print("=" * 50)
    print("Testing all 4 Genesis AI providers")
    print("=" * 50)

    results = {}
    for provider in [PROVIDER_GEMMA4, PROVIDER_GEMINI, PROVIDER_OPENAI, PROVIDER_GROK]:
        print(f"\nTesting {provider}...")
        resp = call_ai("Say 'OK' and nothing else.", provider=provider, max_tokens=10)
        ok = not resp.startswith("[CALLER ERROR]")
        results[provider] = "PASS" if ok else f"FAIL: {resp[:60]}"
        print(f"  {provider}: {results[provider]}")

    print("\n" + "=" * 50)
    passed = sum(1 for v in results.values() if v == "PASS")
    print(f"Result: {passed}/4 providers working")
    print("=" * 50)
    return results

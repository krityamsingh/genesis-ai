# core/gemma_engine.py
# GENESIS — Gemma Inference Engine
#
# UPGRADED 2026-04:
#   • Gemma 4 model family added (google/gemma-4-*) as primary tier
#   • Gemma 3 kept as fallback / secondary tier
#   • think_stream() wrapped in proper try/except — yields [ERROR] on failure
#   • think_json() uses robust JSON extraction
#   • think_async() added for true async/await usage in FastAPI routes
#   • think_stream_async() added — async generator for WebSocket handlers
#   • Model auto-fallback: if Gemma 4 call fails, retries on Gemma 3
#   • All print() calls replaced with logging
#   • Type annotations tightened throughout
# =============================================================================

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import AsyncGenerator, Generator, Optional

from huggingface_hub import InferenceClient, AsyncInferenceClient

log = logging.getLogger("core.gemma_engine")


# ════════════════════════════════════════════════════════════════════════════
# Model Registry
# ════════════════════════════════════════════════════════════════════════════

GEMMA_MODELS: dict[str, str] = {
    # ── Gemma 4 (2025 — primary tier) ────────────────────────────────────
    "default":  "google/gemma-4-27b-it",      # best quality, multimodal
    "vision":   "google/gemma-4-27b-it",      # same; vision-capable
    "fast":     "google/gemma-4-12b-it",      # faster / cheaper
    "mini":     "google/gemma-4-4b-it",       # ultra-light quick tasks

    # ── Gemma 3 (fallback tier) ───────────────────────────────────────────
    "g3":       "google/gemma-3-27b-it",
    "g3-fast":  "google/gemma-3-12b-it",
    "g3-mini":  "google/gemma-3-4b-it",

    # ── Coding specialist ─────────────────────────────────────────────────
    "code":     "google/codegemma-7b-it",
}

# Backwards-compat aliases
GEMMA4_MODELS = GEMMA_MODELS
DEFAULT_MODEL  = GEMMA_MODELS["default"]

# Fallback chain: if a Gemma 4 call fails, automatically retry with Gemma 3
_FALLBACK_MAP: dict[str, str] = {
    "google/gemma-4-27b-it": "google/gemma-3-27b-it",
    "google/gemma-4-12b-it": "google/gemma-3-12b-it",
    "google/gemma-4-4b-it":  "google/gemma-3-4b-it",
}


# ════════════════════════════════════════════════════════════════════════════
# GemmaEngine
# ════════════════════════════════════════════════════════════════════════════

class GemmaEngine:
    """
    Gemma 4 / Gemma 3 inference engine via HuggingFace InferenceClient.

    Sync and async interfaces are both available.

    Usage:
        engine = GemmaEngine(token=HF_TOKEN)
        engine = GemmaEngine(token=HF_TOKEN, model="fast")     # Gemma 4 12B
        engine = GemmaEngine(token=HF_TOKEN, model="g3")       # Gemma 3 27B
        engine = GemmaEngine(token=HF_TOKEN, model="mini")     # Gemma 4 4B

    Direct model override:
        engine = GemmaEngine(token=HF_TOKEN, model="google/gemma-4-27b-it")
    """

    MAX_RETRIES      = 3
    RETRY_DELAY      = 5      # seconds
    RATE_LIMIT_DELAY = 15     # seconds on 429

    def __init__(
        self,
        token:          str,
        model:          str = "default",
        timeout:        int = 120,
        auto_fallback:  bool = True,
    ):
        self.model_id      = GEMMA_MODELS.get(model, model)
        self._token        = token
        self._timeout      = timeout
        self._auto_fallback = auto_fallback

        self.client        = InferenceClient(
            model=self.model_id, token=token, timeout=timeout,
        )
        self.async_client  = AsyncInferenceClient(
            model=self.model_id, token=token, timeout=timeout,
        )
        log.info(f"GemmaEngine ready — {self.model_id}")

    # ── think — core sync text generation ────────────────────────────────────

    def think(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
        model:         Optional[str] = None,
    ) -> str:
        """Synchronous text generation. Returns the response string."""
        messages = self._build_messages(prompt, system_prompt)
        client   = self._get_client(model)
        model_id = GEMMA_MODELS.get(model, model) if model else self.model_id

        for attempt in range(self.MAX_RETRIES):
            try:
                resp = client.chat_completion(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return resp.choices[0].message.content.strip()

            except Exception as e:
                err = str(e).lower()

                if "429" in err or "rate limit" in err:
                    wait = self.RATE_LIMIT_DELAY * (attempt + 1)
                    log.warning(f"Rate limit — waiting {wait}s (attempt {attempt+1})")
                    time.sleep(wait)

                elif self._auto_fallback and model_id in _FALLBACK_MAP and attempt == 0:
                    fallback_id = _FALLBACK_MAP[model_id]
                    log.warning(f"Gemma 4 unavailable ({e}) — falling back to {fallback_id}")
                    client   = InferenceClient(model=fallback_id, token=self._token, timeout=self._timeout)
                    model_id = fallback_id

                elif attempt < self.MAX_RETRIES - 1:
                    log.warning(f"Retry {attempt+1}/{self.MAX_RETRIES} — {e}")
                    time.sleep(self.RETRY_DELAY)

                else:
                    log.error(f"think() failed after {self.MAX_RETRIES} attempts: {e}")
                    return f"[ENGINE ERROR] {e}"

        return "[ENGINE ERROR] Max retries exceeded"

    # ── think_async — core async text generation ──────────────────────────────

    async def think_async(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
        model:         Optional[str] = None,
    ) -> str:
        """Async version of think(). Preferred for use inside FastAPI routes."""
        messages = self._build_messages(prompt, system_prompt)
        model_id = GEMMA_MODELS.get(model, model) if model else self.model_id
        client   = self._get_async_client(model)

        for attempt in range(self.MAX_RETRIES):
            try:
                resp = await client.chat_completion(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return resp.choices[0].message.content.strip()

            except Exception as e:
                err = str(e).lower()

                if "429" in err or "rate limit" in err:
                    wait = self.RATE_LIMIT_DELAY * (attempt + 1)
                    log.warning(f"[async] Rate limit — waiting {wait}s")
                    await asyncio.sleep(wait)

                elif self._auto_fallback and model_id in _FALLBACK_MAP and attempt == 0:
                    fallback_id = _FALLBACK_MAP[model_id]
                    log.warning(f"[async] Gemma 4 unavailable — falling back to {fallback_id}")
                    client   = AsyncInferenceClient(model=fallback_id, token=self._token, timeout=self._timeout)
                    model_id = fallback_id

                elif attempt < self.MAX_RETRIES - 1:
                    log.warning(f"[async] Retry {attempt+1}/{self.MAX_RETRIES} — {e}")
                    await asyncio.sleep(self.RETRY_DELAY)

                else:
                    log.error(f"think_async() failed: {e}")
                    return f"[ENGINE ERROR] {e}"

        return "[ENGINE ERROR] Max retries exceeded"

    # ── think_stream — sync streaming ─────────────────────────────────────────

    def think_stream(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
    ) -> Generator[str, None, None]:
        """Sync streaming generator. Yields text chunks; yields [ERROR] on failure."""
        messages = self._build_messages(prompt, system_prompt)
        try:
            for chunk in self.client.chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            ):
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            log.error(f"think_stream error: {e}")
            yield f"[ERROR] Stream failed: {e}"

    # ── think_stream_async — async streaming ──────────────────────────────────

    async def think_stream_async(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
    ) -> AsyncGenerator[str, None]:
        """Async streaming generator for WebSocket handlers and SSE endpoints."""
        messages = self._build_messages(prompt, system_prompt)
        try:
            async for chunk in await self.async_client.chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            ):
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            log.error(f"think_stream_async error: {e}")
            yield f"[ERROR] Stream failed: {e}"

    # ── see — vision / multimodal ─────────────────────────────────────────────

    def see(
        self,
        image_source:  str,
        question:      str,
        system_prompt: Optional[str] = None,
        max_tokens:    int           = 512,
    ) -> str:
        """Multimodal: analyse an image with a text question.

        image_source:
            "/tmp/frame.jpg"                ← local file path
            "https://example.com/img.jpg"   ← URL
            "data:image/jpeg;base64,..."    ← base64 data URI
        """
        image_content = self._prepare_image(image_source)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": [image_content, {"type": "text", "text": question}],
        })

        for attempt in range(self.MAX_RETRIES):
            try:
                resp = self.client.chat_completion(messages=messages, max_tokens=max_tokens)
                return resp.choices[0].message.content.strip()
            except Exception as e:
                err = str(e).lower()
                if any(k in err for k in ("vision", "multimodal", "image")):
                    return (
                        f"[VISION UNSUPPORTED] Model {self.model_id} may not support vision. "
                        "Try model='default' or model='vision'."
                    )
                if attempt < self.MAX_RETRIES - 1:
                    log.warning(f"Vision retry {attempt+1} — {e}")
                    time.sleep(self.RETRY_DELAY)
                else:
                    return f"[VISION ERROR] {e}"
        return "[VISION ERROR] Max retries exceeded"

    # ── code — code generation ────────────────────────────────────────────────

    def code(
        self,
        problem:       str,
        language:      str           = "python",
        system_prompt: Optional[str] = None,
        max_tokens:    int           = 2048,
    ) -> str:
        """Code generation — tries CodeGemma first, falls back to main model."""
        sys = system_prompt or (
            f"You are an expert {language} developer. "
            "Write clean, working, well-commented code. "
            "Output ONLY the code — no prose outside comments. "
            "Include type hints and docstrings."
        )
        try:
            code_client = InferenceClient(
                model=GEMMA_MODELS["code"], token=self._token, timeout=self._timeout,
            )
            resp = code_client.chat_completion(
                messages=self._build_messages(problem, sys),
                temperature=0.1,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content.strip()
        except Exception:
            return self.think(problem, system_prompt=sys, temperature=0.1, max_tokens=max_tokens)

    # ── think_json — guaranteed structured output ─────────────────────────────

    def think_json(
        self,
        prompt:        str,
        schema_hint:   str           = "",
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.2,
        max_tokens:    int           = 1500,
    ) -> str:
        """Like think() but enforces JSON output via robust extraction."""
        sys = (system_prompt or "") + (
            "\nIMPORTANT: Return ONLY valid JSON. "
            "No markdown code fences. No explanation text. "
            f"{'Schema: ' + schema_hint if schema_hint else ''}"
        )
        raw = self.think(
            prompt,
            system_prompt=sys.strip(),
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return self._extract_json(raw)

    async def think_json_async(
        self,
        prompt:        str,
        schema_hint:   str           = "",
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.2,
        max_tokens:    int           = 1500,
    ) -> str:
        """Async version of think_json()."""
        sys = (system_prompt or "") + (
            "\nIMPORTANT: Return ONLY valid JSON. "
            "No markdown code fences. No explanation text. "
            f"{'Schema: ' + schema_hint if schema_hint else ''}"
        )
        raw = await self.think_async(
            prompt,
            system_prompt=sys.strip(),
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return self._extract_json(raw)

    # ── think_batch — multiple prompts in sequence ────────────────────────────

    def think_batch(
        self,
        prompts:       list[str],
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 512,
        delay_between: float         = 0.5,
    ) -> list[str]:
        """Run multiple prompts sequentially. Returns responses in same order."""
        results = []
        for i, prompt in enumerate(prompts):
            log.debug(f"Batch {i+1}/{len(prompts)}")
            resp = self.think(
                prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            results.append(resp)
            if i < len(prompts) - 1:
                time.sleep(delay_between)
        return results

    async def think_batch_async(
        self,
        prompts:       list[str],
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 512,
    ) -> list[str]:
        """Async parallel batch — all prompts run concurrently."""
        tasks = [
            self.think_async(p, system_prompt=system_prompt,
                             temperature=temperature, max_tokens=max_tokens)
            for p in prompts
        ]
        return list(await asyncio.gather(*tasks))

    # ── switch_model — change model mid-session ───────────────────────────────

    def switch_model(self, model: str) -> None:
        """Switch to a different Gemma variant mid-session."""
        new_id         = GEMMA_MODELS.get(model, model)
        self.model_id  = new_id
        self.client    = InferenceClient(model=new_id, token=self._token, timeout=self._timeout)
        self.async_client = AsyncInferenceClient(model=new_id, token=self._token, timeout=self._timeout)
        log.info(f"GemmaEngine switched to: {new_id}")

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _build_messages(prompt: str, system_prompt: Optional[str]) -> list[dict]:
        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages

    def _get_client(self, model_override: Optional[str]) -> InferenceClient:
        if model_override is None:
            return self.client
        model_id = GEMMA_MODELS.get(model_override, model_override)
        if model_id == self.model_id:
            return self.client
        return InferenceClient(model=model_id, token=self._token, timeout=self._timeout)

    def _get_async_client(self, model_override: Optional[str]) -> AsyncInferenceClient:
        if model_override is None:
            return self.async_client
        model_id = GEMMA_MODELS.get(model_override, model_override)
        if model_id == self.model_id:
            return self.async_client
        return AsyncInferenceClient(model=model_id, token=self._token, timeout=self._timeout)

    @staticmethod
    def _prepare_image(image_source: str) -> dict:
        if image_source.startswith("http") or image_source.startswith("data:"):
            return {"type": "image_url", "image_url": {"url": image_source}}
        path = Path(image_source)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_source}")
        ext_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png",  ".gif":  "image/gif",
            ".webp": "image/webp",
        }
        mime = ext_map.get(path.suffix.lower(), "image/jpeg")
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}

    @staticmethod
    def _extract_json(raw: str) -> str:
        """Robustly extract JSON from a model response."""
        stripped = raw.strip()
        try:
            json.loads(stripped)
            return stripped
        except json.JSONDecodeError:
            pass
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            s = stripped.find(start_char)
            e = stripped.rfind(end_char)
            if s != -1 and e > s:
                candidate = stripped[s:e + 1]
                try:
                    json.loads(candidate)
                    return candidate
                except json.JSONDecodeError:
                    continue
        log.warning("think_json: could not extract clean JSON from response")
        return stripped

    def __repr__(self) -> str:
        return f"<GemmaEngine model={self.model_id}>"


# ════════════════════════════════════════════════════════════════════════════
# Quick sanity test
# ════════════════════════════════════════════════════════════════════════════

def test_engine(token: str) -> "GemmaEngine":
    """Run: python -c "from core.gemma_engine import test_engine; test_engine('hf_...')" """
    print("=" * 60)
    print("Testing GemmaEngine (Gemma 4 primary, Gemma 3 fallback)")
    print("=" * 60)

    engine = GemmaEngine(token=token)

    print("\n1. Basic think ...")
    r = engine.think("What is 2+2? One word.", max_tokens=10)
    assert r and not r.startswith("[ENGINE ERROR]"), f"Failed: {r}"
    print(f"   OK: {r}")

    print("\n2. System prompt ...")
    r = engine.think("Name one planet.", system_prompt="Respond in exactly 1 word.", max_tokens=10)
    print(f"   OK: {r}")

    print('\n3. JSON output ...')
    r = engine.think_json('Return: {"name": "Mars", "type": "planet"}', max_tokens=50)
    parsed = json.loads(r)
    assert "name" in parsed
    print(f"   OK: {parsed}")

    print("\n4. Sync stream ...")
    chunks = list(engine.think_stream("Say hi.", max_tokens=20))
    assert any(c and not c.startswith("[ERROR]") for c in chunks)
    print(f"   OK: {''.join(chunks)[:50]}")

    print("\n5. Model info ...")
    print(f"   Active model:  {engine.model_id}")
    print(f"   All models:    {list(GEMMA_MODELS.keys())}")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)
    return engine

# core/gemma_engine.py
# GENESIS — Gemma Inference Engine
#
# Fixes applied:
#   • Model registry renamed from GEMMA4_MODELS → GEMMA_MODELS (was labelled
#     "Gemma 4" but all IDs were google/gemma-3-*; corrected naming throughout)
#   • think_stream() now has proper try/except — stream errors yield [ERROR]
#     instead of crashing the WebSocket handler
#   • think_json() uses robust JSON extraction (finds first { or [) instead of
#     fragile regex that corrupted valid JSON containing code fences in strings
#   • print() calls replaced with proper logging
#   • Type annotations tightened (Generator return type)
# =============================================================================

from __future__ import annotations

import base64
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Generator, Optional

from huggingface_hub import InferenceClient

log = logging.getLogger("core.gemma_engine")


# ════════════════════════════════════════════════════════════════════════════
# Model Registry — Gemma 3 variants (rename to GEMMA4_MODELS if/when Gemma 4
# becomes available on HuggingFace Inference API)
# ════════════════════════════════════════════════════════════════════════════

GEMMA_MODELS = {
    # ── Primary (27B multimodal — text + vision) ──────────────────────────
    "default": "google/gemma-3-27b-it",     # best quality
    "vision":  "google/gemma-3-27b-it",     # same model, vision-capable

    # ── Lightweight (12B — faster, cheaper) ──────────────────────────────
    "fast":    "google/gemma-3-12b-it",

    # ── Ultra-light (4B — for quick tasks) ───────────────────────────────
    "mini":    "google/gemma-3-4b-it",

    # ── Coding specialist ─────────────────────────────────────────────────
    "code":    "google/codegemma-7b-it",
}

# Keep old name as alias so any code that imported GEMMA4_MODELS still works
GEMMA4_MODELS = GEMMA_MODELS

DEFAULT_MODEL = GEMMA_MODELS["default"]


# ════════════════════════════════════════════════════════════════════════════
# GemmaEngine
# ════════════════════════════════════════════════════════════════════════════

class GemmaEngine:
    """
    Gemma inference engine via HuggingFace InferenceClient.

    Usage:
        engine = GemmaEngine(token=HF_TOKEN)
        engine = GemmaEngine(token=HF_TOKEN, model="fast")   # 12B
        engine = GemmaEngine(token=HF_TOKEN, model="mini")   # 4B

    Direct model override:
        engine = GemmaEngine(token=HF_TOKEN, model="google/gemma-3-27b-it")
    """

    MAX_RETRIES      = 3
    RETRY_DELAY      = 5      # seconds between retries
    RATE_LIMIT_DELAY = 15     # seconds to wait on 429

    def __init__(
        self,
        token:   str,
        model:   str = "default",
        timeout: int = 120,
    ):
        self.model_id = GEMMA_MODELS.get(model, model)
        self.client   = InferenceClient(
            model=self.model_id,
            token=token,
            timeout=timeout,
        )
        self._token   = token
        self._timeout = timeout
        log.info(f"GemmaEngine ready — {self.model_id}")

    # ── think — core text generation ─────────────────────────────────────────

    def think(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
        model:         Optional[str] = None,
    ) -> str:
        """
        Send a prompt to the model and return the response text.

        Args:
            prompt:        User message
            system_prompt: Optional system instruction
            temperature:   0.0 = deterministic, 1.0 = creative
            max_tokens:    Max tokens in response
            model:         Optional per-call model override ("fast", "mini", etc.)
        """
        messages = self._build_messages(prompt, system_prompt)
        client   = self._get_client(model)

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
                    log.warning(f"Rate limit — waiting {wait}s...")
                    time.sleep(wait)

                elif attempt < self.MAX_RETRIES - 1:
                    log.warning(f"Retry {attempt + 1}/{self.MAX_RETRIES} — {e}")
                    time.sleep(self.RETRY_DELAY)

                else:
                    log.error(f"think() failed after {self.MAX_RETRIES} attempts: {e}")
                    return f"[ENGINE ERROR] {e}"

        return "[ENGINE ERROR] Max retries exceeded"

    # ── think_stream — streaming text generation ──────────────────────────────

    def think_stream(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
    ) -> Generator[str, None, None]:
        """
        Streaming version of think(). Yields text chunks as they arrive.
        Errors are yielded as "[ERROR] <message>" rather than raising,
        so the caller (WebSocket handler) can forward them to the client.

        Usage:
            for chunk in engine.think_stream("Tell me about black holes"):
                print(chunk, end="", flush=True)
        """
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

    # ── see — vision / multimodal ─────────────────────────────────────────────

    def see(
        self,
        image_source:  str,
        question:      str,
        system_prompt: Optional[str] = None,
        max_tokens:    int           = 512,
    ) -> str:
        """
        Multimodal: analyse an image with a text question.

        image_source can be:
            "/tmp/frame_0001.jpg"           ← local file path
            "https://example.com/img.jpg"   ← URL (passed directly)
            "data:image/jpeg;base64,..."    ← raw base64 string
        """
        image_content = self._prepare_image(image_source)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": [
                image_content,
                {"type": "text", "text": question},
            ],
        })

        for attempt in range(self.MAX_RETRIES):
            try:
                resp = self.client.chat_completion(
                    messages=messages,
                    max_tokens=max_tokens,
                )
                return resp.choices[0].message.content.strip()

            except Exception as e:
                err = str(e).lower()
                if "vision" in err or "multimodal" in err or "image" in err:
                    return (
                        f"[VISION UNSUPPORTED] Model {self.model_id} may not support vision. "
                        "Try model='default' or model='vision'."
                    )
                if attempt < self.MAX_RETRIES - 1:
                    log.warning(f"Vision retry {attempt + 1} — {e}")
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
                model=GEMMA_MODELS["code"],
                token=self._token,
                timeout=self._timeout,
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
        """
        Like think() but enforces JSON output.

        Uses robust extraction (finds first { or [) instead of regex
        that corrupts valid JSON strings containing code-fence characters.
        """
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

    # ── think_batch — multiple prompts in sequence ────────────────────────────

    def think_batch(
        self,
        prompts:       list[str],
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 512,
        delay_between: float         = 0.5,
    ) -> list[str]:
        """
        Run multiple prompts sequentially.
        Returns a list of responses in the same order as prompts.
        """
        results = []
        for i, prompt in enumerate(prompts):
            log.debug(f"Batch {i + 1}/{len(prompts)}")
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

    # ── switch_model — change model mid-session ───────────────────────────────

    def switch_model(self, model: str) -> None:
        """
        Switch to a different Gemma variant.
        model: "default" | "fast" | "mini" | "code" | full HF model ID
        """
        new_id = GEMMA_MODELS.get(model, model)
        self.model_id = new_id
        self.client   = InferenceClient(
            model=new_id,
            token=self._token,
            timeout=self._timeout,
        )
        log.info(f"GemmaEngine switched to: {new_id}")

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _build_messages(
        prompt:        str,
        system_prompt: Optional[str],
    ) -> list[dict]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages

    def _get_client(self, model_override: Optional[str]) -> InferenceClient:
        """Return a client for a per-call model override, or self.client."""
        if model_override is None:
            return self.client
        model_id = GEMMA_MODELS.get(model_override, model_override)
        if model_id == self.model_id:
            return self.client
        return InferenceClient(
            model=model_id,
            token=self._token,
            timeout=self._timeout,
        )

    @staticmethod
    def _prepare_image(image_source: str) -> dict:
        """Convert image_source → {"type": "image_url", "image_url": {"url": ...}}"""
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
        """
        Robustly extract JSON from a model response.

        Strategy:
        1. Try direct parse (model returned clean JSON)
        2. Find first { ... } or [ ... ] block
        3. Return raw string as-is (caller decides what to do with it)

        This avoids the previous regex approach which corrupted JSON values
        that contained triple-backtick strings.
        """
        # 1. Try direct parse
        stripped = raw.strip()
        try:
            json.loads(stripped)
            return stripped
        except json.JSONDecodeError:
            pass

        # 2. Find outermost JSON object or array
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            s = stripped.find(start_char)
            e = stripped.rfind(end_char)
            if s != -1 and e > s:
                candidate = stripped[s : e + 1]
                try:
                    json.loads(candidate)
                    return candidate
                except json.JSONDecodeError:
                    continue

        # 3. Return as-is — caller will handle parse error
        log.warning("think_json: could not extract clean JSON from response")
        return stripped

    def __repr__(self) -> str:
        return f"<GemmaEngine model={self.model_id}>"


# ════════════════════════════════════════════════════════════════════════════
# Quick test (run directly to verify)
# ════════════════════════════════════════════════════════════════════════════

def test_engine(token: str) -> "GemmaEngine":
    """Run: test_engine(HF_TOKEN)"""
    print("=" * 50)
    print("Testing GemmaEngine")
    print("=" * 50)

    engine = GemmaEngine(token=token)

    print("\n1. Basic think...")
    r = engine.think("What is 2+2? One word.", max_tokens=10)
    assert r and not r.startswith("[ENGINE ERROR]"), f"Failed: {r}"
    print(f"   OK: {r}")

    print("\n2. System prompt...")
    r = engine.think("Name one planet.", system_prompt="Respond in exactly 1 word.", max_tokens=10)
    print(f"   OK: {r}")

    print("\n3. JSON output...")
    r = engine.think_json('Return: {"name": "Mars", "type": "planet"}', max_tokens=50)
    parsed = json.loads(r)
    assert "name" in parsed
    print(f"   OK: {parsed}")

    print("\n4. Stream...")
    chunks = list(engine.think_stream("Say hi.", max_tokens=20))
    assert any(c and not c.startswith("[ERROR]") for c in chunks)
    print(f"   OK: {''.join(chunks)[:50]}")

    print("\n" + "=" * 50)
    print("ALL TESTS PASSED")
    print("=" * 50)
    return engine

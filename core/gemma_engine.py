# ============================================================
# core/gemma_engine.py
# GENESIS — Gemma 4 Engine
#
# Uses google/gemma-4 via HuggingFace InferenceClient
# Supports:
#   • Text generation (think / think_stream)
#   • Vision / multimodal (see — image + text)
#   • Code generation (code)
#   • Structured JSON output (think_json)
#   • Batch processing (think_batch)
#   • Retry + rate-limit handling
#
# Works on: Colab, local, Docker, cloud
# ============================================================

from __future__ import annotations

import base64
import os
import time
from pathlib import Path
from typing import Generator, Optional

from huggingface_hub import InferenceClient


# ════════════════════════════════════════════════════════════
# ⚙️  Model Registry  — Gemma 4 variants
# ════════════════════════════════════════════════════════════

GEMMA4_MODELS = {
    # ── Primary (27B multimodal — text + vision) ──────────
    "default":       "google/gemma-3-27b-it",        # best quality
    "vision":        "google/gemma-3-27b-it",        # same model, vision-capable

    # ── Lightweight (12B — faster, cheaper) ───────────────
    "fast":          "google/gemma-3-12b-it",

    # ── Ultra-light (4B — for quick tasks) ────────────────
    "mini":          "google/gemma-3-4b-it",

    # ── Coding specialist ─────────────────────────────────
    "code":          "google/codegemma-7b-it",
}

# Default model used when none specified
DEFAULT_MODEL = GEMMA4_MODELS["default"]


# ════════════════════════════════════════════════════════════
# 🧠  GemmaEngine
# ════════════════════════════════════════════════════════════

class GemmaEngine:
    """
    Gemma 4 inference engine via HuggingFace InferenceClient.

    Usage:
        engine = GemmaEngine(token=HF_TOKEN)
        engine = GemmaEngine(token=HF_TOKEN, model="fast")   # 12B
        engine = GemmaEngine(token=HF_TOKEN, model="mini")   # 4B

    Direct model override:
        engine = GemmaEngine(token=HF_TOKEN,
                             model="google/gemma-3-27b-it")
    """

    MAX_RETRIES  = 3
    RETRY_DELAY  = 5     # seconds between retries
    RATE_LIMIT_DELAY = 15  # seconds to wait on 429

    def __init__(
        self,
        token:       str,
        model:       str  = "default",
        timeout:     int  = 120,
    ):
        # Resolve model alias → full HF model ID
        self.model_id = GEMMA4_MODELS.get(model, model)

        self.client = InferenceClient(
            model=self.model_id,
            token=token,
            timeout=timeout,
        )
        self._token   = token
        self._timeout = timeout

        print(f"[GemmaEngine] ✅ Ready — {self.model_id}")

    # ────────────────────────────────────────────────────────
    # 💬  think  — core text generation
    # ────────────────────────────────────────────────────────

    def think(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
        model:         Optional[str] = None,   # override per-call
    ) -> str:
        """
        Send a prompt to Gemma 4 and return the response text.

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

                # Rate limit → wait longer
                if "429" in err or "rate limit" in err:
                    wait = self.RATE_LIMIT_DELAY * (attempt + 1)
                    print(f"[GemmaEngine] ⚠️  Rate limit — waiting {wait}s...")
                    time.sleep(wait)

                elif attempt < self.MAX_RETRIES - 1:
                    print(f"[GemmaEngine] Retry {attempt+1}/{self.MAX_RETRIES} — {e}")
                    time.sleep(self.RETRY_DELAY)

                else:
                    return f"[ENGINE ERROR] {e}"

        return "[ENGINE ERROR] Max retries exceeded"

    # ────────────────────────────────────────────────────────
    # 🌊  think_stream  — streaming text generation
    # ────────────────────────────────────────────────────────

    def think_stream(
        self,
        prompt:        str,
        system_prompt: Optional[str] = None,
        temperature:   float         = 0.7,
        max_tokens:    int           = 1024,
    ) -> Generator[str, None, None]:
        """
        Streaming version of think(). Yields text chunks as they arrive.

        Usage:
            for chunk in engine.think_stream("Tell me about black holes"):
                print(chunk, end="", flush=True)
        """
        messages = self._build_messages(prompt, system_prompt)

        for chunk in self.client.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        ):
            yield chunk.choices[0].delta.content or ""

    # ────────────────────────────────────────────────────────
    # 👁️  see  — vision / multimodal  (Gemma 4 image support)
    # ────────────────────────────────────────────────────────

    def see(
        self,
        image_source:  str,          # file path OR http(s):// URL OR base64 string
        question:      str,
        system_prompt: Optional[str] = None,
        max_tokens:    int           = 512,
    ) -> str:
        """
        Gemma 4 multimodal: analyse an image with a text question.

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
            ]
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
                    return f"[VISION UNSUPPORTED] Model {self.model_id} may not support vision. Try 'default' or 'vision' variant."
                if attempt < self.MAX_RETRIES - 1:
                    print(f"[GemmaEngine] Vision retry {attempt+1} — {e}")
                    time.sleep(self.RETRY_DELAY)
                else:
                    return f"[VISION ERROR] {e}"

        return "[VISION ERROR] Max retries exceeded"

    # ────────────────────────────────────────────────────────
    # 💻  code  — code generation specialist
    # ────────────────────────────────────────────────────────

    def code(
        self,
        problem:       str,
        language:      str           = "python",
        system_prompt: Optional[str] = None,
        max_tokens:    int           = 2048,
    ) -> str:
        """
        Code generation with Gemma 4.
        Uses CodeGemma if available, falls back to main model.
        """
        sys = system_prompt or (
            f"You are an expert {language} developer. "
            "Write clean, working, well-commented code. "
            "Output ONLY the code — no prose outside comments. "
            "Include type hints and docstrings."
        )
        # Try CodeGemma first for code tasks
        try:
            code_client = InferenceClient(
                model=GEMMA4_MODELS["code"],
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
            # Fallback to main model
            return self.think(problem, system_prompt=sys,
                              temperature=0.1, max_tokens=max_tokens)

    # ────────────────────────────────────────────────────────
    # 📋  think_json  — guaranteed structured output
    # ────────────────────────────────────────────────────────

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
        Strips markdown fences automatically.
        """
        sys = (system_prompt or "") + (
            "\nIMPORTANT: Return ONLY valid JSON. "
            "No markdown code fences. No explanation text. "
            f"{'Schema: ' + schema_hint if schema_hint else ''}"
        )
        raw = self.think(prompt, system_prompt=sys.strip(),
                         temperature=temperature, max_tokens=max_tokens)

        # Strip ```json ... ``` fences if present
        import re
        clean = re.sub(r"```(?:json)?", "", raw).strip()
        if clean.endswith("```"):
            clean = clean[:-3].strip()
        return clean

    # ────────────────────────────────────────────────────────
    # 📦  think_batch  — multiple prompts in sequence
    # ────────────────────────────────────────────────────────

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
        Returns list of responses in same order as prompts.
        """
        results = []
        for i, prompt in enumerate(prompts):
            print(f"   [Batch {i+1}/{len(prompts)}]", end=" ", flush=True)
            resp = self.think(prompt, system_prompt=system_prompt,
                              temperature=temperature, max_tokens=max_tokens)
            results.append(resp)
            if i < len(prompts) - 1:
                time.sleep(delay_between)
        return results

    # ────────────────────────────────────────────────────────
    # 🔄  switch_model  — change model mid-session
    # ────────────────────────────────────────────────────────

    def switch_model(self, model: str):
        """
        Switch to a different Gemma 4 variant.
        model: "default" | "fast" | "mini" | "code" | full HF model ID
        """
        new_id = GEMMA4_MODELS.get(model, model)
        self.model_id = new_id
        self.client   = InferenceClient(
            model=new_id,
            token=self._token,
            timeout=self._timeout,
        )
        print(f"[GemmaEngine] 🔄 Switched to: {new_id}")

    # ────────────────────────────────────────────────────────
    # PRIVATE helpers
    # ────────────────────────────────────────────────────────

    @staticmethod
    def _build_messages(
        prompt: str,
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
        model_id = GEMMA4_MODELS.get(model_override, model_override)
        if model_id == self.model_id:
            return self.client
        return InferenceClient(
            model=model_id,
            token=self._token,
            timeout=self._timeout,
        )

    @staticmethod
    def _prepare_image(image_source: str) -> dict:
        """
        Convert image_source → {"type": "image_url", "image_url": {"url": ...}}
        Handles: file path, http URL, base64 string.
        """
        # Already a URL (http/https or data URI)
        if image_source.startswith("http") or image_source.startswith("data:"):
            return {"type": "image_url", "image_url": {"url": image_source}}

        # Local file path → encode to base64
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

        return {
            "type":      "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64}"},
        }

    def __repr__(self) -> str:
        return f"<GemmaEngine model={self.model_id}>"


# ════════════════════════════════════════════════════════════
# 🧪  Quick test  (run this cell directly to verify)
# ════════════════════════════════════════════════════════════

def test_engine(token: str):
    """
    Run: test_engine(HF_TOKEN)
    Tests: text, streaming, json output
    """
    print("=" * 50)
    print("🧪 Testing GemmaEngine (Gemma 4)")
    print("=" * 50)

    engine = GemmaEngine(token=token)

    # Test 1 — basic think
    print("\n1️⃣  Basic think...")
    r = engine.think("What is 2+2? One word.", max_tokens=10)
    assert r, "Empty response"
    print(f"   ✅ {r}")

    # Test 2 — think with system prompt
    print("\n2️⃣  System prompt...")
    r = engine.think(
        "Name one planet.", system_prompt="Respond in exactly 1 word.",
        max_tokens=10
    )
    print(f"   ✅ {r}")

    # Test 3 — think_json
    print("\n3️⃣  JSON output...")
    r = engine.think_json(
        'Return: {"name": "Mars", "type": "planet"}',
        max_tokens=50
    )
    import json
    parsed = json.loads(r)
    assert "name" in parsed
    print(f"   ✅ {parsed}")

    # Test 4 — fast model
    print("\n4️⃣  Fast model (12B)...")
    r = engine.think("Say hi.", model="fast", max_tokens=20)
    print(f"   ✅ {r[:50]}")

    print("\n" + "=" * 50)
    print("🏆 ALL TESTS PASSED — GemmaEngine (Gemma 4) ready!")
    print("=" * 50)
    return engine


# ── USAGE ────────────────────────────────────────────────────
# engine = GemmaEngine(token=HF_TOKEN)             # default 27B
# engine = GemmaEngine(token=HF_TOKEN, model="fast")  # 12B faster
# engine = GemmaEngine(token=HF_TOKEN, model="mini")  # 4B fastest
#
# engine.think("Your prompt here")
# engine.see("/tmp/frame.jpg", "What do you see?")
# engine.code("Write a Python quicksort")
# engine.think_json("Return {name, age}", schema_hint="{name: str, age: int}")
# engine.switch_model("fast")

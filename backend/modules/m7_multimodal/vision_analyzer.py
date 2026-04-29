"""M7 VisionAnalyzer — Analyze images using vision-capable LLM providers."""
from __future__ import annotations
import base64, logging, os
from typing import Any, Dict, Optional

log = logging.getLogger("m7.vision")

class VisionAnalyzer:
    def __init__(self, config: Optional[Dict] = None):
        self.config   = config or {}
        self.provider = os.getenv("VISION_PROVIDER", "google")  # google | openai | anthropic
        log.info("VisionAnalyzer using provider: %s", self.provider)

    async def analyze(
        self,
        image_bytes: bytes,
        media_type: str,
        prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        prompt = prompt or "Describe this image in detail. Identify key objects, text, charts, or diagrams."
        b64 = base64.b64encode(image_bytes).decode()

        if self.provider == "google":
            return await self._analyze_google(b64, media_type, prompt)
        if self.provider == "openai":
            return await self._analyze_openai(b64, media_type, prompt)
        if self.provider == "anthropic":
            return await self._analyze_anthropic(b64, media_type, prompt)

        return {"result": "No vision provider configured.", "summary": "", "tokens_used": 0}

    async def _analyze_google(self, b64: str, media_type: str, prompt: str) -> Dict:
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
            model = genai.GenerativeModel("gemini-1.5-flash")
            import PIL.Image, io, base64 as b64mod
            img = PIL.Image.open(io.BytesIO(b64mod.b64decode(b64)))
            resp = model.generate_content([prompt, img])
            text = resp.text or ""
            return {"result": text, "summary": text[:200], "tokens_used": len(text.split())}
        except Exception as e:
            log.error("Google vision error: %s", e)
            return {"result": f"Vision analysis unavailable: {e}", "summary": "", "tokens_used": 0}

    async def _analyze_openai(self, b64: str, media_type: str, prompt: str) -> Dict:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                    {"type": "text", "text": prompt},
                ]}],
                max_tokens=1024,
            )
            text = resp.choices[0].message.content or ""
            return {"result": text, "summary": text[:200], "tokens_used": resp.usage.total_tokens}
        except Exception as e:
            log.error("OpenAI vision error: %s", e)
            return {"result": f"Vision analysis unavailable: {e}", "summary": "", "tokens_used": 0}

    async def _analyze_anthropic(self, b64: str, media_type: str, prompt: str) -> Dict:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
            msg = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                messages=[{"role": "user", "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                    {"type": "text", "text": prompt},
                ]}],
            )
            text = msg.content[0].text if msg.content else ""
            return {"result": text, "summary": text[:200], "tokens_used": msg.usage.input_tokens + msg.usage.output_tokens}
        except Exception as e:
            log.error("Anthropic vision error: %s", e)
            return {"result": f"Vision analysis unavailable: {e}", "summary": "", "tokens_used": 0}

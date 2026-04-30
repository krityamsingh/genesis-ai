"""M7 AudioTranscriber — Transcribe audio using Whisper or cloud APIs."""
from __future__ import annotations
import io, logging, os, tempfile
from typing import Any, Dict, Optional

log = logging.getLogger("m7.audio")

class AudioTranscriber:
    def __init__(self, config: Optional[Dict] = None):
        self.config   = config or {}
        self.provider = os.getenv("AUDIO_PROVIDER", "openai")  # openai | local

    async def transcribe(self, audio_bytes: bytes, media_type: str) -> Dict[str, Any]:
        if self.provider == "openai":
            return await self._transcribe_openai(audio_bytes, media_type)
        return await self._transcribe_local(audio_bytes)

    async def _transcribe_openai(self, audio_bytes: bytes, media_type: str) -> Dict:
        try:
            from openai import AsyncOpenAI
            ext_map = {"audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg",
                       "audio/mp4": "m4a", "audio/webm": "webm"}
            ext = ext_map.get(media_type, "mp3")
            client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
            resp = await client.audio.transcriptions.create(
                model="whisper-1",
                file=(f"audio.{ext}", io.BytesIO(audio_bytes), media_type),
                response_format="verbose_json",
            )
            text = resp.text or ""
            return {
                "result": {"transcript": text, "language": getattr(resp, "language", "unknown"), "duration": getattr(resp, "duration", None)},
                "summary": text[:200],
                "tokens_used": len(text.split()),
            }
        except Exception as e:
            log.error("OpenAI transcription error: %s", e)
            return {"result": {"transcript": "", "error": str(e)}, "summary": "", "tokens_used": 0}

    async def _transcribe_local(self, audio_bytes: bytes) -> Dict:
        """Fallback: attempt local Whisper if installed."""
        try:
            import whisper
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes); tmp = f.name
            model = whisper.load_model("base")
            result = model.transcribe(tmp)
            os.unlink(tmp)
            text = result.get("text", "")
            return {"result": {"transcript": text, "language": result.get("language")}, "summary": text[:200], "tokens_used": len(text.split())}
        except Exception as e:
            log.error("Local transcription error: %s", e)
            return {"result": {"transcript": "", "error": "Whisper not available"}, "summary": "", "tokens_used": 0}

"""
M7 MultimodalProcessor — Unified entry point for image/audio/document inputs.
Dispatches to the appropriate sub-analyzer based on media type.
"""
from __future__ import annotations
import base64, logging, mimetypes
from pathlib import Path
from typing import Any, Dict, Optional

from .vision_analyzer import VisionAnalyzer
from .audio_transcriber import AudioTranscriber
from .doc_extractor import DocumentExtractor

log = logging.getLogger("m7.processor")

SUPPORTED_IMAGE_TYPES  = {"image/jpeg", "image/png", "image/webp", "image/gif"}
SUPPORTED_AUDIO_TYPES  = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"}
SUPPORTED_DOC_TYPES    = {"application/pdf", "text/plain", "text/markdown",
                           "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

class MultimodalProcessor:
    """Route multimodal inputs to the correct analyzer and return structured results."""

    def __init__(self, config: Optional[Dict] = None):
        self.config   = config or {}
        self.vision   = VisionAnalyzer(config)
        self.audio    = AudioTranscriber(config)
        self.docs     = DocumentExtractor(config)
        log.info("M7 MultimodalProcessor initialized")

    async def process(
        self,
        data: bytes | str,
        media_type: Optional[str] = None,
        filename: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a multimodal input.

        Args:
            data:       Raw bytes or base64-encoded string.
            media_type: MIME type. Auto-detected from filename if None.
            filename:   Original filename (used for MIME detection).
            prompt:     Optional user question about the content.

        Returns:
            {
              "type": "image"|"audio"|"document"|"unknown",
              "media_type": str,
              "result": ...,          # analyzer-specific output
              "summary": str,         # human-readable summary
              "tokens_used": int,
            }
        """
        # Resolve media type
        if not media_type and filename:
            guessed, _ = mimetypes.guess_type(filename)
            media_type = guessed or "application/octet-stream"
        media_type = (media_type or "").lower()

        # Decode if base64 string
        if isinstance(data, str):
            data = base64.b64decode(data + "==")  # padding-safe

        log.info("Processing %s (%d bytes)", media_type, len(data))

        if media_type in SUPPORTED_IMAGE_TYPES:
            result = await self.vision.analyze(data, media_type, prompt)
            return {"type": "image", "media_type": media_type, **result}

        if media_type in SUPPORTED_AUDIO_TYPES:
            result = await self.audio.transcribe(data, media_type)
            return {"type": "audio", "media_type": media_type, **result}

        if media_type in SUPPORTED_DOC_TYPES:
            result = await self.docs.extract(data, media_type)
            return {"type": "document", "media_type": media_type, **result}

        log.warning("Unsupported media type: %s", media_type)
        return {
            "type": "unknown", "media_type": media_type,
            "result": None, "summary": f"Unsupported media type: {media_type}",
            "tokens_used": 0,
        }

    @staticmethod
    def encode_image_b64(path: str | Path) -> str:
        return base64.b64encode(Path(path).read_bytes()).decode()

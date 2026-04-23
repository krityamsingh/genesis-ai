"""Unit tests for M7 Multimodal Processor."""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

from modules.m7_multimodal.processor import MultimodalProcessor, SUPPORTED_IMAGE_TYPES


class TestMultimodalProcessor:
    def setup_method(self):
        self.processor = MultimodalProcessor()

    @pytest.mark.asyncio
    async def test_detect_image_type(self):
        """Images should route to VisionAnalyzer."""
        with patch.object(self.processor.vision, "analyze", new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = {"result": "A cat", "summary": "Cat", "tokens_used": 5}
            result = await self.processor.process(
                data=b"\xff\xd8\xff" + b"\x00" * 100,
                media_type="image/jpeg",
                prompt="What is this?",
            )
        assert result["type"] == "image"
        mock_analyze.assert_called_once()

    @pytest.mark.asyncio
    async def test_detect_audio_type(self):
        """Audio should route to AudioTranscriber."""
        with patch.object(self.processor.audio, "transcribe", new_callable=AsyncMock) as mock_trans:
            mock_trans.return_value = {"result": {"transcript": "Hello world"}, "summary": "Hello world", "tokens_used": 2}
            result = await self.processor.process(
                data=b"\x00" * 1000,
                media_type="audio/mpeg",
            )
        assert result["type"] == "audio"
        mock_trans.assert_called_once()

    @pytest.mark.asyncio
    async def test_unsupported_type(self):
        """Unsupported media type should return 'unknown' type."""
        result = await self.processor.process(
            data=b"some data",
            media_type="application/x-unknown",
        )
        assert result["type"] == "unknown"

    @pytest.mark.asyncio
    async def test_base64_input(self):
        """Base64 string input should be decoded correctly."""
        import base64
        img_bytes = b"\xff\xd8\xff" + b"\x00" * 100
        b64 = base64.b64encode(img_bytes).decode()

        with patch.object(self.processor.vision, "analyze", new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = {"result": "Test", "summary": "", "tokens_used": 0}
            await self.processor.process(data=b64, media_type="image/jpeg")
        mock_analyze.assert_called_once()

    def test_supported_image_types(self):
        """Verify expected image MIME types are supported."""
        assert "image/jpeg" in SUPPORTED_IMAGE_TYPES
        assert "image/png"  in SUPPORTED_IMAGE_TYPES
        assert "image/webp" in SUPPORTED_IMAGE_TYPES


class TestDocumentExtractor:
    def setup_method(self):
        from modules.m7_multimodal.doc_extractor import DocumentExtractor
        self.extractor = DocumentExtractor()

    @pytest.mark.asyncio
    async def test_plain_text(self):
        text = "Hello, this is a test document with some content."
        result = await self.extractor.extract(text.encode("utf-8"), "text/plain")
        assert "Hello" in result["result"]["text"]
        assert result["tokens_used"] > 0

    @pytest.mark.asyncio
    async def test_empty_text(self):
        result = await self.extractor.extract(b"", "text/plain")
        assert result["result"]["text"] == ""

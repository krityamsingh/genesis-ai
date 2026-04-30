"""M7 DocumentExtractor — Extract text, structure, and metadata from PDFs and documents."""
from __future__ import annotations
import io, logging
from typing import Any, Dict, Optional

log = logging.getLogger("m7.docs")

class DocumentExtractor:
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}

    async def extract(self, data: bytes, media_type: str) -> Dict[str, Any]:
        if media_type == "application/pdf":
            return self._extract_pdf(data)
        if media_type in ("text/plain", "text/markdown"):
            text = data.decode("utf-8", errors="replace")
            return {"result": {"text": text, "pages": 1, "word_count": len(text.split())},
                    "summary": text[:300], "tokens_used": len(text.split())}
        if "wordprocessingml" in media_type:
            return self._extract_docx(data)
        return {"result": None, "summary": "Unsupported document type.", "tokens_used": 0}

    def _extract_pdf(self, data: bytes) -> Dict:
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages.append({"page": i + 1, "text": text.strip()})
            full_text = "\n\n".join(p["text"] for p in pages if p["text"])
            return {
                "result": {"pages": pages, "page_count": len(reader.pages), "word_count": len(full_text.split()), "metadata": dict(reader.metadata or {})},
                "summary": full_text[:400],
                "tokens_used": len(full_text.split()),
            }
        except Exception as e:
            log.error("PDF extraction error: %s", e)
            return {"result": None, "summary": f"PDF extraction failed: {e}", "tokens_used": 0}

    def _extract_docx(self, data: bytes) -> Dict:
        try:
            from docx import Document
            doc = Document(io.BytesIO(data))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n".join(paragraphs)
            return {
                "result": {"paragraphs": paragraphs, "word_count": len(full_text.split())},
                "summary": full_text[:400],
                "tokens_used": len(full_text.split()),
            }
        except Exception as e:
            log.error("DOCX extraction error: %s", e)
            return {"result": None, "summary": f"DOCX extraction failed: {e}", "tokens_used": 0}

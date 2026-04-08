# data/pipeline/splitter.py
from __future__ import annotations


def split_by_sentences(text: str, chunk_size: int = 5) -> list[str]:
    """Split text into chunks of N sentences."""
    import re
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    for i in range(0, len(sentences), chunk_size):
        chunk = " ".join(sentences[i:i + chunk_size]).strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def split_by_chars(text: str, max_chars: int = 1000,
                   overlap: int = 100) -> list[str]:
    """Sliding window character-level splitter with overlap."""
    chunks = []
    start  = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end])
        start += max_chars - overlap
    return chunks


def split_by_paragraphs(text: str) -> list[str]:
    """Split on double newlines (paragraphs)."""
    import re
    paras = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paras if p.strip()]

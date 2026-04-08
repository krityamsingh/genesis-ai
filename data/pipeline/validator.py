# data/pipeline/validator.py
from __future__ import annotations


def is_meaningful(text: str, min_words: int = 10) -> bool:
    """Return True if text has enough words to be useful."""
    return len(text.split()) >= min_words


def has_language(text: str, lang: str = "en") -> bool:
    """Basic heuristic — check ASCII ratio for English."""
    if lang == "en":
        ascii_ratio = sum(c.isascii() for c in text) / max(len(text), 1)
        return ascii_ratio > 0.7
    return True


def validate_batch(texts: list[str], min_words: int = 10) -> list[str]:
    """Filter out junk entries from a list."""
    return [t for t in texts if is_meaningful(t, min_words)]

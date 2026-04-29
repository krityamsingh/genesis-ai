# shared/helpers.py
# GENESIS — Utility helpers

from __future__ import annotations
import hashlib, time, re
from typing import Any


def sha256_id(text: str, prefix: str = "", length: int = 16) -> str:
    """Stable short ID from any string."""
    h = hashlib.sha256(text.encode()).hexdigest()[:length]
    return f"{prefix}{h}" if prefix else h


def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)


def truncate(text: str, max_chars: int, suffix: str = "…") -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars - len(suffix)] + suffix


def smart_truncate(text: str, max_chars: int) -> str:
    """Keep first 70% + last 30% to preserve conclusion."""
    if len(text) <= max_chars:
        return text
    head = int(max_chars * 0.70)
    tail = max_chars - head
    return text[:head] + "\n...[truncated]...\n" + text[-tail:]


def strip_json_fences(raw: str) -> str:
    """Remove ```json ... ``` markdown fences."""
    clean = re.sub(r"```(?:json)?", "", raw).strip()
    return clean.rstrip("`").strip()


def now_ts() -> float:
    return time.time()


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def flatten(nested: list[list]) -> list:
    return [item for sub in nested for item in sub]

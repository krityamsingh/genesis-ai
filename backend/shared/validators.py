# shared/validators.py
# GENESIS — Input validators

from __future__ import annotations
import re, os
from urllib.parse import urlparse


def is_url(text: str) -> bool:
    try:
        r = urlparse(text.strip())
        return r.scheme in ("http", "https") and bool(r.netloc)
    except Exception:
        return False


def is_pdf(path: str) -> bool:
    return os.path.isfile(path) and path.lower().endswith(".pdf")


def is_audio(path: str) -> bool:
    exts = {".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".opus", ".webm", ".mkv"}
    return os.path.isfile(path) and os.path.splitext(path)[1].lower() in exts


def is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


def is_valid_username(username: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_]{3,32}$", username))


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def validate_temperature(t: float) -> float:
    return clamp(float(t), 0.0, 2.0)


def validate_max_tokens(n: int) -> int:
    return max(1, min(int(n), 8192))

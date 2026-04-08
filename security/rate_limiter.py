# security/rate_limiter.py
from __future__ import annotations
import time
from collections import defaultdict
from shared.exceptions import RateLimitError

_WINDOW  = 60       # seconds
_DEFAULT = 60       # requests per window

_counters: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, limit: int = _DEFAULT):
    """
    Simple in-process sliding-window rate limiter.
    key: any string (IP, user_id, endpoint, …)
    Raises RateLimitError if over limit.
    """
    now = time.time()
    hits = _counters[key]
    # Remove old hits outside the window
    _counters[key] = [t for t in hits if now - t < _WINDOW]
    if len(_counters[key]) >= limit:
        raise RateLimitError(
            f"Rate limit exceeded ({limit} req/{_WINDOW}s). Slow down."
        )
    _counters[key].append(now)


def reset_limit(key: str):
    _counters.pop(key, None)

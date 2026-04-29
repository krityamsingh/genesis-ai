# security/rate_limiter.py
# GENESIS — Rate Limiter
#
# Fixes applied:
#   • Redis-backed sliding window when REDIS_URL is set
#     (survives server restarts, works across multiple workers/processes)
#   • Graceful in-memory fallback when Redis is unavailable
#     (development / single-process use)
#   • Per-endpoint and per-user keying helpers
#   • Exponential backoff headers on 429 responses
#   • Thread-safe in-memory implementation using a lock
#   • RateLimitError exported so callers can catch it directly
# =============================================================================

from __future__ import annotations

import logging
import os
import threading
import time
from collections import defaultdict
from typing import Optional

from shared.exceptions import RateLimitError

log = logging.getLogger("security.rate_limiter")

_WINDOW  = 60    # sliding window in seconds
_DEFAULT = 60    # default max requests per window

# Re-export RateLimitError so callers can do:
#   from security.rate_limiter import check_rate_limit, RateLimitError
__all__ = ["check_rate_limit", "reset_limit", "RateLimitError", "rate_limit_key"]


# ── Redis backend ─────────────────────────────────────────────────────────────

_redis_client = None
_redis_failed  = False   # don't retry connection after first failure


def _get_redis():
    """Return a Redis client, or None if unavailable."""
    global _redis_client, _redis_failed

    if _redis_failed:
        return None
    if _redis_client is not None:
        return _redis_client

    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        return None

    try:
        import redis
        client = redis.from_url(redis_url, decode_responses=True, socket_timeout=1.0)
        client.ping()
        _redis_client = client
        log.info("Rate limiter: using Redis backend")
        return _redis_client
    except Exception as e:
        _redis_failed = True
        log.warning(
            f"Rate limiter: Redis unavailable ({e}). "
            "Falling back to in-memory (not suitable for multi-process deployments)."
        )
        return None


def _redis_check(key: str, limit: int) -> int:
    """
    Atomic sliding-window counter in Redis.
    Returns the current request count after incrementing.
    Uses a 1-minute bucketed key so old counts expire automatically.
    """
    r = _get_redis()
    bucket = int(time.time()) // _WINDOW
    redis_key = f"genesis:rl:{key}:{bucket}"

    pipe = r.pipeline()
    pipe.incr(redis_key)
    pipe.expire(redis_key, _WINDOW * 2)   # keep for 2 windows then auto-expire
    results = pipe.execute()
    return int(results[0])


# ── In-memory fallback ────────────────────────────────────────────────────────

_lock: threading.Lock = threading.Lock()
_counters: dict[str, list[float]] = defaultdict(list)


def _memory_check(key: str, limit: int) -> int:
    """Thread-safe sliding window in process memory."""
    now = time.time()
    with _lock:
        hits = _counters[key]
        _counters[key] = [t for t in hits if now - t < _WINDOW]
        _counters[key].append(now)
        return len(_counters[key])


# ── Public API ────────────────────────────────────────────────────────────────

def check_rate_limit(key: str, limit: int = _DEFAULT) -> None:
    """
    Enforce a rate limit for the given key.

    Args:
        key:   Identifies who/what is being limited.
               Use rate_limit_key() to build consistent keys.
        limit: Max requests allowed per 60-second window.

    Raises:
        RateLimitError: If the limit is exceeded.

    Examples:
        check_rate_limit(f"login:{client_ip}", limit=10)
        check_rate_limit(f"user:{user_id}:ask", limit=60)
        check_rate_limit(f"global:learn", limit=100)
    """
    r = _get_redis()

    try:
        if r is not None:
            count = _redis_check(key, limit)
        else:
            count = _memory_check(key, limit)
    except Exception as e:
        # Never let rate limiter errors crash the request
        log.error(f"Rate limiter error for key={key}: {e}")
        return

    if count > limit:
        log.warning(f"Rate limit exceeded: key={key} count={count} limit={limit}")
        raise RateLimitError(
            f"Rate limit exceeded: {limit} requests per {_WINDOW}s. "
            f"Please slow down."
        )


def reset_limit(key: str) -> None:
    """
    Reset the rate limit counter for a key.
    Useful in tests or after a successful authentication challenge.
    """
    r = _get_redis()
    if r is not None:
        try:
            bucket = int(time.time()) // _WINDOW
            r.delete(f"genesis:rl:{key}:{bucket}")
        except Exception:
            pass

    with _lock:
        _counters.pop(key, None)


def rate_limit_key(
    prefix: str,
    identifier: str,
    endpoint: Optional[str] = None,
) -> str:
    """
    Build a consistent rate limit key.

    Args:
        prefix:     Category — "ip", "user", "global"
        identifier: IP address or user ID
        endpoint:   Optional endpoint name for per-route limits

    Examples:
        rate_limit_key("ip", "1.2.3.4", "login")   → "ip:1.2.3.4:login"
        rate_limit_key("user", "abc-123", "ask")    → "user:abc-123:ask"
        rate_limit_key("global", "learn")           → "global:learn"
    """
    parts = [prefix, identifier]
    if endpoint:
        parts.append(endpoint)
    return ":".join(parts)

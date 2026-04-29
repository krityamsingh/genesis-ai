# security/rate_limiter_mongo.py
# GENESIS — MongoDB-backed rate limiter
# Replaces security/rate_limiter.py (in-memory dict + Redis).
# Uses MongoDB TTL index for automatic expiry — no Redis needed.

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

from shared.exceptions import RateLimitError

log = logging.getLogger("security.rate_limiter_mongo")

_WINDOW_SECONDS = 60
_DEFAULT_LIMIT  = 60

__all__ = ["check_rate_limit", "reset_limit", "blacklist_token", "is_blacklisted", "RateLimitError"]


async def check_rate_limit(key: str, limit: int = _DEFAULT_LIMIT) -> None:
    """
    Enforce a sliding-window rate limit using MongoDB TTL documents.

    Args:
        key:   e.g. "login:1.2.3.4", "user:<id>:ask"
        limit: Max requests per 60-second window.

    Raises:
        RateLimitError: If limit is exceeded.
    """
    from database.models_mongo import RateLimit

    try:
        expires_at = datetime.utcnow() + timedelta(seconds=_WINDOW_SECONDS)

        # Upsert: increment count or create with count=1
        existing = await RateLimit.find_one(RateLimit.key == key)

        if existing is None:
            await RateLimit(key=key, hits=1, expires_at=expires_at).insert()
            current_count = 1
        else:
            existing.hits += 1
            existing.expires_at = expires_at   # extend TTL on each hit
            await existing.save()
            current_count = existing.hits

        if current_count > limit:
            log.warning(f"Rate limit exceeded: key={key} count={current_count} limit={limit}")
            raise RateLimitError(
                f"Rate limit exceeded: {limit} requests per {_WINDOW_SECONDS}s. "
                "Please slow down."
            )

    except RateLimitError:
        raise
    except Exception as e:
        # Never let rate limiter errors crash the request
        log.error(f"Rate limiter error for key={key}: {e}")


async def reset_limit(key: str) -> None:
    """Delete the rate limit document for a key (e.g. after a successful auth challenge)."""
    from database.models_mongo import RateLimit
    try:
        doc = await RateLimit.find_one(RateLimit.key == key)
        if doc:
            await doc.delete()
    except Exception as e:
        log.error(f"reset_limit error for key={key}: {e}")


async def blacklist_token(jti: str, ttl_seconds: int) -> None:
    """
    Add a JWT JTI to the blacklist with a TTL matching the token's remaining lifetime.
    Replaces the Redis blacklist from auth_routes.py logout.
    """
    from database.models_mongo import RateLimit
    try:
        bkey = f"blacklist:{jti}"
        expires_at = datetime.utcnow() + timedelta(seconds=max(ttl_seconds, 1))
        existing = await RateLimit.find_one(RateLimit.key == bkey)
        if not existing:
            await RateLimit(key=bkey, hits=1, expires_at=expires_at).insert()
        log.info(f"Token blacklisted: jti={jti[:8]}... ttl={ttl_seconds}s")
    except Exception as e:
        log.error(f"blacklist_token error: {e}")


async def is_blacklisted(jti: str) -> bool:
    """Check if a JWT JTI has been blacklisted (logged out)."""
    from database.models_mongo import RateLimit
    try:
        bkey = f"blacklist:{jti}"
        doc = await RateLimit.find_one(RateLimit.key == bkey)
        return doc is not None
    except Exception:
        return False

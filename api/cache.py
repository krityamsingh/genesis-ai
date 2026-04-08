# api/cache.py
# Simple in-process TTL cache (no Redis dependency for dev)
from __future__ import annotations
import time
from typing import Any

_store: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)


def cache_get(key: str) -> Any | None:
    entry = _store.get(key)
    if entry and entry[1] > time.time():
        return entry[0]
    _store.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl: int = 300):
    _store[key] = (value, time.time() + ttl)


def cache_delete(key: str):
    _store.pop(key, None)


def cache_clear():
    _store.clear()

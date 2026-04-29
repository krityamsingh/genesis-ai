# core/cache/cache_manager.py — Two-tier L1(LRU)+L2(Mongo) cache (Phase 6)
from __future__ import annotations
import hashlib, logging
from typing import Optional
from core.cache.lru_cache import LRUCache

log = logging.getLogger("core.cache")

class CacheManager:
    def __init__(self, lru_size: int = 256):
        self._lru = LRUCache(maxsize=lru_size)
        self._hits_l1 = self._hits_l2 = self._misses = 0

    def _key(self, query: str, user_id: str, module: str) -> str:
        raw = f"{user_id}:{module}:{query[:120]}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    async def get(self, query: str, user_id: str, module: str) -> Optional[str]:
        k = self._key(query, user_id, module)
        v = self._lru.get(k)
        if v is not None: self._hits_l1 += 1; return v
        try:
            from database.mongo import get_db
            db = await get_db()
            doc = await db["semantic_cache"].find_one({"key": k})
            if doc: self._hits_l2 += 1; self._lru.set(k, doc["response"]); return doc["response"]
        except Exception as e: log.debug(f"Cache L2 get failed: {e}")
        self._misses += 1; return None

    async def set(self, query: str, user_id: str, module: str, response: str) -> None:
        k = self._key(query, user_id, module)
        self._lru.set(k, response)
        try:
            from database.mongo import get_db
            from datetime import datetime, timedelta
            db = await get_db()
            await db["semantic_cache"].replace_one(
                {"key": k},
                {"key": k, "response": response, "created_at": datetime.utcnow(),
                 "expires_at": datetime.utcnow() + timedelta(hours=1)},
                upsert=True)
        except Exception as e: log.debug(f"Cache L2 set failed: {e}")

    def stats(self) -> dict:
        total = self._hits_l1 + self._hits_l2 + self._misses
        return {"l1_hits": self._hits_l1, "l2_hits": self._hits_l2, "misses": self._misses,
                "hit_rate": round((self._hits_l1+self._hits_l2)/max(1,total),3), "lru_size": self._lru.size}

# services/memory_service.py — User memory CRUD (Phase 4)
from __future__ import annotations
import logging
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger("services.memory")
MAX_SUMMARIES = 20

async def _get_or_create(user_id: str):
    from database.models_mongo import UserMemory
    mem = await UserMemory.find_one(UserMemory.user_id == user_id)
    if not mem:
        mem = UserMemory(user_id=user_id)
        await mem.insert()
    return mem

async def get_context(user_id: str) -> str:
    mem = await _get_or_create(user_id)
    parts = []
    if mem.facts:        parts.append("Facts: " + "; ".join(f"{k}={v}" for k,v in list(mem.facts.items())[:10]))
    if mem.preferences:  parts.append("Prefs: " + "; ".join(f"{k}={v}" for k,v in mem.preferences.items()))
    if mem.topic_affinity:
        top = sorted(mem.topic_affinity.items(), key=lambda x: -x[1])[:5]
        parts.append("Topics: " + ", ".join(t for t,_ in top))
    if mem.summaries:    parts.append("Recent: " + mem.summaries[-1])
    return " | ".join(parts)

async def set_fact(user_id: str, key: str, value: Any) -> None:
    mem = await _get_or_create(user_id)
    mem.facts[key] = value; mem.updated_at = datetime.utcnow(); await mem.save()

async def set_preference(user_id: str, key: str, value: Any) -> None:
    mem = await _get_or_create(user_id)
    mem.preferences[key] = value; mem.updated_at = datetime.utcnow(); await mem.save()

async def delete_fact(user_id: str, key: str) -> None:
    mem = await _get_or_create(user_id)
    mem.facts.pop(key, None); mem.updated_at = datetime.utcnow(); await mem.save()

async def bump_topic(user_id: str, topic: str, delta: float = 0.05) -> None:
    mem = await _get_or_create(user_id)
    mem.topic_affinity[topic] = min(1.0, mem.topic_affinity.get(topic, 0.0) + delta)
    mem.updated_at = datetime.utcnow(); await mem.save()

async def update_from_interaction(user_id: str, query: str, response: str) -> None:
    topics = ["code","math","science","history","language","ai","data"]
    ql = query.lower()
    for t in topics:
        if t in ql:
            try: await bump_topic(user_id, t)
            except Exception: pass

async def get_memory_dict(user_id: str) -> dict:
    mem = await _get_or_create(user_id)
    return {"facts": mem.facts, "preferences": mem.preferences,
            "topic_affinity": mem.topic_affinity,
            "summaries_count": len(mem.summaries),
            "updated_at": mem.updated_at.isoformat() if mem.updated_at else None}

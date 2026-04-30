# core/moderation.py — Content moderation pipeline (Phase 7)
# Only invoked when FEATURE_MODERATION != "off"
from __future__ import annotations
import logging, os

log = logging.getLogger("core.moderation")

_BLOCKLIST = ["bomb making","exploit kit","malware payload","ddos tool"]

async def check(text: str, user_id: Optional[str] = None) -> dict:
    from typing import Optional
    from config.feature_flags import flags
    level = flags.moderation_level
    if level == "off": return {"allowed": True, "reason": None}
    tl = text.lower()
    for w in _BLOCKLIST:
        if w in tl:
            await _log(user_id, text, "keyword", "blocked")
            return {"allowed": False, "reason": f"Blocked: {w}"}
    if level == "llm":
        res = await _llm_check(text)
        if not res["allowed"]: await _log(user_id, text, "llm_policy", "blocked"); return res
    return {"allowed": True, "reason": None}

async def _llm_check(text: str) -> dict:
    try:
        from core.gemma_engine import GemmaEngine
        engine = GemmaEngine(token=os.getenv("HF_TOKEN",""), model=os.getenv("GEMMA_MODEL","default"))
        p = f"Is this harmful or illegal? Reply only SAFE or UNSAFE.\nMessage: {text[:400]}"
        r = engine.think(p, temperature=0.0, max_tokens=5)
        if "UNSAFE" in r.upper(): return {"allowed": False, "reason": "LLM policy violation"}
    except Exception as e: log.warning(f"LLM moderation failed: {e}")
    return {"allowed": True, "reason": None}

async def _log(user_id, text, vtype, action):
    try:
        from database.models_mongo import ModerationLog
        await ModerationLog(user_id=user_id, input_text=text[:500], violation_type=vtype, action_taken=action).insert()
    except Exception as e: log.warning(f"Moderation log failed: {e}")

from typing import Optional

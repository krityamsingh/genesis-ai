# services/usage_service.py — Usage tracking (Phase 6)
from __future__ import annotations
import logging
from datetime import datetime, timedelta

log = logging.getLogger("services.usage")
DEFAULT_LIMIT = 100_000

async def log_usage(user_id: str, tokens: int, model: str) -> None:
    from database.models_mongo import UsageLog
    from core.model_router import estimate_cost
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing = await UsageLog.find_one(UsageLog.user_id == user_id, UsageLog.period_start == today)
    if existing:
        existing.tokens_used += tokens; existing.requests_made += 1
        existing.cost_estimate += estimate_cost(model, tokens); await existing.save()
    else:
        await UsageLog(user_id=user_id, tokens_used=tokens, requests_made=1,
                       cost_estimate=estimate_cost(model, tokens), model_used=model,
                       period_start=today, period_end=today+timedelta(days=1)).insert()

async def check_quota(user_id: str, limit: int = DEFAULT_LIMIT) -> bool:
    from database.models_mongo import UsageLog
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    entry = await UsageLog.find_one(UsageLog.user_id == user_id, UsageLog.period_start == today)
    return not entry or entry.tokens_used < limit

async def get_usage(user_id: str) -> dict:
    from database.models_mongo import UsageLog
    logs = await UsageLog.find(UsageLog.user_id == user_id).sort(-UsageLog.period_start).limit(30).to_list()
    return {"logs": [{"date": str(l.period_start.date()), "tokens": l.tokens_used,
                      "requests": l.requests_made, "cost": l.cost_estimate} for l in logs]}

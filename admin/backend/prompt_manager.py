# admin/backend/prompt_manager.py — MongoDB/Beanie version
from __future__ import annotations
from database.models_mongo import PromptLog


async def get_recent_prompts(n: int = 50) -> list[dict]:
    n = min(n, 500)
    logs = await PromptLog.find_all().sort(-PromptLog.created_at).limit(n).to_list()
    return [
        {
            "id":         str(l.id),
            "module":     l.module,
            "prompt":     l.prompt[:200],
            "response":   l.response[:200],
            "latency_ms": l.latency_ms,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]


async def clear_prompt_logs():
    await PromptLog.find_all().delete()

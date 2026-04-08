# admin/backend/prompt_manager.py
from __future__ import annotations
from database.db     import db_session
from database.models import PromptLog


def get_recent_prompts(n: int = 50) -> list[dict]:
    with db_session() as db:
        logs = (db.query(PromptLog)
                  .order_by(PromptLog.created_at.desc())
                  .limit(n).all())
        return [{"module": l.module, "prompt": l.prompt[:200],
                 "response": l.response[:200], "latency_ms": l.latency_ms,
                 "created_at": l.created_at} for l in logs]


def clear_prompt_logs():
    with db_session() as db:
        db.query(PromptLog).delete()

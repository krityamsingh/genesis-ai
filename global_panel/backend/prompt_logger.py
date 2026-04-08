# global_panel/backend/prompt_logger.py
from __future__ import annotations
import time, uuid
from database.db     import db_session
from database.models import PromptLog


def log_prompt(module: str, prompt: str, response: str,
               model: str, temperature: float, latency_ms: float,
               user_id: str = None):
    with db_session() as db:
        db.add(PromptLog(
            id          = str(uuid.uuid4()),
            user_id     = user_id,
            module      = module,
            prompt      = prompt,
            response    = response,
            model       = model,
            temperature = temperature,
            latency_ms  = latency_ms,
            created_at  = time.time(),
        ))

# admin/backend/model_monitor.py
from __future__ import annotations


def model_info(engine) -> dict:
    return {
        "model_id":    engine.model_id,
        "max_retries": engine.MAX_RETRIES,
        "retry_delay": engine.RETRY_DELAY,
    }


def router_stats(router) -> dict:
    return router.stats()

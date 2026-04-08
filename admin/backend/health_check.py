# admin/backend/health_check.py
from __future__ import annotations
import time


def system_health(kg, engine, memory) -> dict:
    checks = {}

    # KG
    try:
        kg.count("knowledge")
        checks["knowledge_graph"] = "ok"
    except Exception as e:
        checks["knowledge_graph"] = f"error: {e}"

    # Engine ping (no LLM call — just check client exists)
    checks["engine"] = "ok" if engine.client else "error: no client"

    # Memory
    checks["memory"] = f"ok ({memory.stats()['buffer_turns']} turns buffered)"

    checks["timestamp"] = int(time.time())
    checks["overall"]   = "ok" if all(
        v == "ok" or v.startswith("ok") for v in checks.values()
        if isinstance(v, str)
    ) else "degraded"
    return checks

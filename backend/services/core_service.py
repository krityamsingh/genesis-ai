# services/core_service.py
from __future__ import annotations
import logging
from typing import Optional

log = logging.getLogger("services.core")

def run_ask(m1, query: str) -> str:
    return m1.ask(query)

def run_learn(m1, source: str) -> dict:
    return m1.learn(source)

def run_route(router, query: str, context: Optional[dict] = None) -> dict:
    return router.route(query, context=context)

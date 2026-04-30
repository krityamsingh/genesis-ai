# core/context_manager.py — Sliding-window context manager (Phase 4)
from __future__ import annotations
import logging
from typing import Any, Dict, List

log = logging.getLogger("core.context_manager")

class ContextManager:
    def __init__(self, max_tokens: int = 4096, window_size: int = 20):
        self.max_tokens  = max_tokens
        self.window_size = window_size

    def truncate(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if len(messages) <= self.window_size:
            return messages
        recent = messages[-self.window_size:]
        older  = messages[:-self.window_size]
        scored = sorted([(self._score(m), m) for m in older], key=lambda x: -x[0])
        budget = self.max_tokens - self._tokens(recent)
        selected = []
        for score, msg in scored:
            cost = self._tokens([msg])
            if budget - cost >= 0:
                selected.append(msg); budget -= cost
        sel_ids = {id(m) for m in selected}
        return [m for m in older if id(m) in sel_ids] + recent

    def _score(self, m: Dict[str, Any]) -> float:
        c = m.get("content", "")
        return min(1.0, len(c) / 500) + (2.0 if m.get("role") == "system" else 0) + (0.5 if "?" in c else 0)

    def _tokens(self, msgs: List[Dict[str, Any]]) -> int:
        return sum(len(m.get("content", "")) for m in msgs) // 4

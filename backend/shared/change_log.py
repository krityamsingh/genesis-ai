# shared/change_log.py
# GENESIS — Runtime Change Tracker
# Records every structural upgrade event at startup so it's always visible
# in logs and /health endpoint. Never silent transformations.

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

log = logging.getLogger("shared.change_log")

_changes: list[dict[str, Any]] = []


def record(phase: str, step: str, description: str, breaking: bool = False) -> None:
    """Record an upgrade step. Call from startup code."""
    entry = {
        "phase":       phase,
        "step":        step,
        "description": description,
        "breaking":    breaking,
        "ts":          datetime.utcnow().isoformat(),
    }
    _changes.append(entry)
    level = logging.WARNING if breaking else logging.INFO
    log.log(level, f"[UPGRADE {phase}/{step}] {description}")


def all_changes() -> list[dict]:
    return list(_changes)


def summary() -> dict:
    return {
        "total":    len(_changes),
        "breaking": sum(1 for c in _changes if c["breaking"]),
        "phases":   sorted({c["phase"] for c in _changes}),
        "latest":   _changes[-1] if _changes else None,
    }

# admin/backend/logs_viewer.py
from __future__ import annotations
import os


def tail_log(log_file: str = "genesis.log", n: int = 100) -> list[str]:
    """Return the last N lines of the log file."""
    path = os.getenv("LOG_FILE", log_file)
    if not os.path.isfile(path):
        return ["[No log file found]"]
    with open(path) as f:
        lines = f.readlines()
    return [l.rstrip() for l in lines[-n:]]

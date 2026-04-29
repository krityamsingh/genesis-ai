# shared/logger.py
# GENESIS — Structured Logger
#
# Fixes applied:
#   • Added JSON structured logging mode (LOG_FORMAT=json)
#     JSON logs integrate with Railway's log aggregator, Datadog, and
#     Papertrail without needing regex parsing
#   • Default mode still outputs human-readable text for local development
#   • Dead code path for file logging now clearly documented as
#     not appropriate for Railway (stdout only)
#   • Root logger configured so third-party libraries (uvicorn, sqlalchemy)
#     respect the LOG_LEVEL env var
# =============================================================================

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler

_LOG_LEVEL  = os.getenv("LOG_LEVEL",  "INFO").upper()
_LOG_FILE   = os.getenv("LOG_FILE",   "")        # empty = stdout only (correct for Railway)
_LOG_FORMAT = os.getenv("LOG_FORMAT", "text")    # "text" | "json"

_TEXT_FMT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"

_configured = False


def _configure_root() -> None:
    """Configure the root logger once at first get_logger() call."""
    global _configured
    if _configured:
        return
    _configured = True

    level = getattr(logging, _LOG_LEVEL, logging.INFO)

    if _LOG_FORMAT == "json":
        formatter = _JsonFormatter()
    else:
        formatter = logging.Formatter(_TEXT_FMT, datefmt=_DATE_FMT)

    # ── Console handler (always active) ──────────────────────────────────────
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    console.setLevel(level)

    # ── File handler (local dev only — NOT for Railway) ──────────────────────
    handlers = [console]
    if _LOG_FILE:
        fh = RotatingFileHandler(
            _LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=3
        )
        fh.setFormatter(formatter)
        fh.setLevel(level)
        handlers.append(fh)

    # Configure root logger
    root = logging.getLogger()
    root.setLevel(level)
    for h in handlers:
        root.addHandler(h)

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("huggingface_hub").setLevel(logging.WARNING)


class _JsonFormatter(logging.Formatter):
    """
    Emit each log record as a single-line JSON object.
    Compatible with Railway, Datadog, Papertrail, and most log aggregators.
    """

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        payload: dict = {
            "time":    self.formatTime(record, _DATE_FMT),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exception"] = "".join(
                traceback.format_exception(*record.exc_info)
            ).strip()

        # Include any extra fields attached via log.info("msg", extra={...})
        for key, val in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "message", "module",
                "msecs", "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName", "exc_info", "exc_text",
            }:
                try:
                    json.dumps(val)   # only include JSON-serializable values
                    payload[key] = val
                except (TypeError, ValueError):
                    payload[key] = str(val)

        return json.dumps(payload, ensure_ascii=False)


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger.

    Usage:
        from shared.logger import get_logger
        log = get_logger(__name__)
        log.info("Hello")
        log.error("Something broke", extra={"user_id": "abc-123"})
    """
    _configure_root()
    return logging.getLogger(name)

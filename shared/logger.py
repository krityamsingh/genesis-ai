# shared/logger.py
# GENESIS — Structured logger

from __future__ import annotations
import logging, sys, os
from logging.handlers import RotatingFileHandler

_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
_LOG_FILE  = os.getenv("LOG_FILE", "")

_FMT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
_DATE = "%Y-%m-%d %H:%M:%S"


def get_logger(name: str) -> logging.Logger:
    """
    Return a configured logger.
    Usage:
        from shared.logger import get_logger
        log = get_logger(__name__)
        log.info("Hello")
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # already configured

    logger.setLevel(getattr(logging, _LOG_LEVEL, logging.INFO))

    fmt = logging.Formatter(_FMT, datefmt=_DATE)

    # Console
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # File (optional)
    if _LOG_FILE:
        fh = RotatingFileHandler(
            _LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=3
        )
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    logger.propagate = False
    return logger

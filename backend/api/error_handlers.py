# api/error_handlers.py
# GENESIS — Global Exception Handlers
#
# Fixes applied:
#   • generic_exception_handler no longer leaks internal exception details
#     (str(exc)) to clients in production — that exposes stack traces,
#     file paths, and implementation details that attackers can use
#   • In DEBUG mode (DEBUG=true env), full details are still returned for
#     local development convenience
#   • GenesisError subclasses return their message (these are intentional,
#     user-facing errors) but still hide raw Python tracebacks
#   • Request path and method logged alongside every error for easier debugging
# =============================================================================

from __future__ import annotations

import logging
import os

from fastapi import Request
from fastapi.responses import JSONResponse

from shared.exceptions import GenesisError

log = logging.getLogger("api.error_handlers")

_DEBUG = os.getenv("DEBUG", "false").lower() == "true"


async def genesis_exception_handler(request: Request, exc: GenesisError) -> JSONResponse:
    """
    Handle all GenesisError subclasses (AuthError, ForbiddenError, etc.).
    These are intentional, user-facing errors — their message is safe to return.
    """
    log.warning(
        f"{exc.__class__.__name__} on {request.method} {request.url.path}: {exc}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error":  exc.__class__.__name__,
            "detail": str(exc),
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all for unexpected exceptions.

    In production: returns a generic 500 message — never exposes exception
    details, file paths, or stack traces to clients.

    In debug mode (DEBUG=true): includes exc type and message for easier
    local development.
    """
    log.exception(
        f"Unhandled {exc.__class__.__name__} on {request.method} {request.url.path}: {exc}"
    )

    if _DEBUG:
        detail = f"{exc.__class__.__name__}: {exc}"
    else:
        detail = "An internal server error occurred. Please try again later."

    return JSONResponse(
        status_code=500,
        content={
            "error":  "InternalServerError",
            "detail": detail,
        },
    )

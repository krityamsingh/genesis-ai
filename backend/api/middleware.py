# api/middleware.py
# GENESIS — HTTP Middleware (Phase 0 monitoring + Phase 7 security headers)
from __future__ import annotations

import logging
import time
import uuid

from starlette.requests import Request
from starlette.responses import Response

log = logging.getLogger("api.middleware")

SECURITY_HEADERS = {
    "X-Frame-Options":        "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection":       "1; mode=block",
    "Referrer-Policy":        "strict-origin-when-cross-origin",
}


async def logging_middleware(request: Request, call_next) -> Response:
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start = time.monotonic()
    response: Response = await call_next(request)
    ms = int((time.monotonic() - start) * 1000)
    log.info(f"[{request_id}] {request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{ms}ms"
    for h, v in SECURITY_HEADERS.items():
        response.headers[h] = v
    return response

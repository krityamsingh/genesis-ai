# api/middleware.py
from __future__ import annotations
import time
from fastapi import Request
from shared.logger import get_logger

log = get_logger("api.middleware")

async def logging_middleware(request: Request, call_next):
    t0  = time.time()
    res = await call_next(request)
    ms  = (time.time() - t0) * 1000
    log.info(f"{request.method} {request.url.path} → {res.status_code} ({ms:.0f}ms)")
    return res

# api/error_handlers.py
from fastapi import Request
from fastapi.responses import JSONResponse
from shared.exceptions import GenesisError

async def genesis_exception_handler(request: Request, exc: GenesisError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.__class__.__name__, "detail": str(exc)},
    )

async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "InternalError", "detail": str(exc)},
    )

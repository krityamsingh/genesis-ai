# api/main.py — FastAPI application factory
from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from security.cors_config  import CORS_SETTINGS
from shared.exceptions     import GenesisError
from api.error_handlers    import genesis_exception_handler, generic_exception_handler
from api.middleware        import logging_middleware
from api.routes            import register_routes
from api.websocket         import ws_stream_endpoint
from database.db           import init_db

log = logging.getLogger("api.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler (replaces deprecated on_event)."""
    try:
        init_db()
        log.info("Database initialised successfully.")
    except Exception as e:
        log.error(f"DB init failed (non-fatal): {e}")
    yield
    # shutdown logic here if needed


def create_app() -> FastAPI:
    app = FastAPI(
        title="GENESIS API",
        version="1.0.0",
        description="GENESIS AI — Self-Learning System",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(CORSMiddleware, **CORS_SETTINGS)

    # Logging middleware
    from starlette.middleware.base import BaseHTTPMiddleware
    app.add_middleware(BaseHTTPMiddleware, dispatch=logging_middleware)

    # Error handlers
    app.add_exception_handler(GenesisError, genesis_exception_handler)
    app.add_exception_handler(Exception,    generic_exception_handler)

    # Routes
    register_routes(app)

    # WebSocket
    app.add_api_websocket_route("/ws/stream", ws_stream_endpoint)

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "genesis-api"}

    return app


app = create_app()

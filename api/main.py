# api/main.py — FastAPI application factory
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from security.cors_config  import CORS_SETTINGS
from shared.exceptions     import GenesisError
from api.error_handlers    import genesis_exception_handler, generic_exception_handler
from api.middleware        import logging_middleware
from api.routes            import register_routes
from api.websocket         import ws_stream_endpoint
from database.db           import init_db

log = logging.getLogger("api.main")

# Path to the pre-built Vite output
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    try:
        init_db()
        log.info("Database initialised successfully.")
    except Exception as e:
        log.error(f"DB init failed (non-fatal): {e}")
    yield


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

    # ── API routes ────────────────────────────────────────
    register_routes(app)

    # WebSocket
    app.add_api_websocket_route("/ws/stream", ws_stream_endpoint)

    # Health check (no prefix so Railway healthcheck hits it directly)
    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "genesis-api"}

    # ── Frontend static files ─────────────────────────────
    # Only mount if the dist folder was built (it won't exist in pure-API mode)
    if FRONTEND_DIST.exists():
        # Serve static assets (JS/CSS/images) under /assets
        assets_dir = FRONTEND_DIST / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        # SPA catch-all: any non-API, non-WS path returns index.html
        index_html = FRONTEND_DIST / "index.html"

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(request: Request, full_path: str):
            # Let API and WS paths fall through (they're registered before this)
            # Serve any static file that actually exists in dist
            file_path = FRONTEND_DIST / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            # SPA fallback
            return FileResponse(str(index_html))

    return app


app = create_app()

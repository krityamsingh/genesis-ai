# api/main.py
# GENESIS — FastAPI Application Factory
#
# Fixes applied:
#   • seed_all() guarded behind RUN_SEEDS=true env var — previously ran on
#     every startup including production restarts, causing duplicate data
#     and IntegrityErrors on rolling redeploys
#   • config/base.yaml port corrected to 8080 (was 8000, conflicted with Dockerfile)
#   • Startup logs the effective config for easier debugging in Railway logs
# =============================================================================

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

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

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""

    # ── Database ──────────────────────────────────────────────────────────────
    try:
        init_db()
        log.info("Database initialised.")
    except Exception as e:
        log.error(f"DB init failed (non-fatal): {e}")

    # ── Seeding ───────────────────────────────────────────────────────────────
    # Only run seeds when explicitly requested (e.g. first deploy).
    # Set RUN_SEEDS=true in env to trigger. Never run on every restart.
    if os.getenv("RUN_SEEDS", "false").lower() == "true":
        try:
            from database.seeds import seed_all
            seed_all()
            log.info("Database seeded successfully.")
        except Exception as e:
            log.error(f"Seeding failed (non-fatal): {e}")
    else:
        log.info("Skipping seeds (RUN_SEEDS != true).")

    # ── Log startup config for debugging ─────────────────────────────────────
    log.info(
        f"GENESIS starting | "
        f"model={os.getenv('GEMMA_MODEL', 'default')} | "
        f"db={'postgres' if 'postgresql' in os.getenv('DATABASE_URL', '') else 'sqlite'} | "
        f"redis={'yes' if os.getenv('REDIS_URL') else 'no (in-memory fallback)'} | "
        f"port={os.getenv('PORT', '8080')}"
    )

    yield
    log.info("GENESIS shutting down.")


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

    # API routes
    register_routes(app)

    # WebSocket
    app.add_api_websocket_route("/ws/stream", ws_stream_endpoint)

    # Health check (no auth — Railway healthcheck hits this)
    @app.get("/health", include_in_schema=False)
    async def health():
        return {"status": "ok", "service": "genesis-api"}

    @app.get("/", include_in_schema=False)
    async def root():
        if FRONTEND_DIST.exists():
            return FileResponse(str(FRONTEND_DIST / "index.html"))
        return {
            "message": "GENESIS API is running",
            "docs":    "/docs",
            "health":  "/health",
            "note":    "Run frontend via: cd frontend && npm run dev",
        }

    # Frontend static files (only if dist was built)
    if FRONTEND_DIST.exists():
        assets_dir = FRONTEND_DIST / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        index_html = FRONTEND_DIST / "index.html"

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(request: Request, full_path: str):
            file_path = FRONTEND_DIST / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(index_html))

    return app


app = create_app()

# api/main.py
# GENESIS — FastAPI Application Factory
#
# FIXES APPLIED:
#   • init_singletons(app) called during lifespan startup (was missing before).
#   • Auto-seed: if the users table is empty on startup, seed_all() runs
#     automatically so the admin user always exists without requiring the
#     operator to remember RUN_SEEDS=true on first deploy.
#     Subsequent restarts skip seeding (idempotent seed_all).
#   • Fallback password: if ADMIN_PASSWORD is not set in the environment
#     (common on Railway/cloud platforms that don't read .env files),
#     a safe built-in default is used so seeding never silently fails.
#   • RESET_ADMIN_PASSWORD hook: set this env var to true in Railway Variables
#     to force-rehash the admin password on next startup (fixes corrupted hashes).
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
from api.dependencies      import init_singletons

log = logging.getLogger("api.main")

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# Safe built-in fallback — used only when ADMIN_PASSWORD is not set at all.
# Operators should always override this via Railway Variables.
_FALLBACK_PASSWORD = "Genesis@2024!"
_BLOCKED_PASSWORDS = {"", "changeme", "password"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""

    # ── Database ──────────────────────────────────────────────────────────────
    try:
        init_db()
        log.info("Database initialised.")
    except Exception as e:
        log.error(f"DB init failed (non-fatal): {e}")

    # ── Resolve admin password (with safe fallback) ───────────────────────────
    # Cloud platforms (Railway, Render, Fly) inject env vars directly and do
    # NOT read .env files. If ADMIN_PASSWORD is missing, use the fallback so
    # seeding never silently fails.
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if admin_password in _BLOCKED_PASSWORDS:
        log.warning(
            "ADMIN_PASSWORD not set or insecure — using built-in fallback password. "
            "Set ADMIN_PASSWORD in your Railway Variables to use your own password."
        )
        os.environ["ADMIN_PASSWORD"] = _FALLBACK_PASSWORD

    # ── Auto-seed if admin user doesn't exist ─────────────────────────────────
    try:
        from database.db import db_session
        from database.models import User
        with db_session() as db:
            has_admin = db.query(User).filter_by(is_admin=True).first()

        if not has_admin:
            log.info("No admin user found — running seeds automatically.")
            from database.seeds import seed_all
            result = seed_all()
            log.info(f"Auto-seed complete: {result}")
        else:
            log.info("Admin user exists — skipping auto-seed.")
    except Exception as e:
        log.error(f"Auto-seed failed (non-fatal): {e}")

    # ── Password reset hook ───────────────────────────────────────────────────
    # Set RESET_ADMIN_PASSWORD=true in Railway Variables to force-rehash the
    # admin password on next startup. Fixes corrupted/old bcrypt hashes.
    # Remove the variable after the first successful deploy.
    if os.getenv("RESET_ADMIN_PASSWORD", "false").lower() == "true":
        try:
            from database.db import db_session
            from database.models import User
            from security.password_hash import hash_password
            new_pw = os.getenv("ADMIN_PASSWORD", _FALLBACK_PASSWORD)
            with db_session() as db:
                admin = db.query(User).filter_by(is_admin=True).first()
                if admin:
                    admin.hashed_pw = hash_password(new_pw)
                    log.info(f"RESET_ADMIN_PASSWORD: rehashed password for '{admin.username}'")
                else:
                    log.warning("RESET_ADMIN_PASSWORD set but no admin user found.")
        except Exception as e:
            log.error(f"Password reset failed (non-fatal): {e}")

    # ── Manual seed override (kept for CI / reset scenarios) ──────────────────
    if os.getenv("RUN_SEEDS", "false").lower() == "true":
        try:
            from database.seeds import seed_all
            seed_all()
            log.info("Manual seed (RUN_SEEDS=true) complete.")
        except Exception as e:
            log.error(f"Manual seed failed (non-fatal): {e}")

    # ── Singletons ────────────────────────────────────────────────────────────
    try:
        init_singletons(app)
        log.info("Singletons initialised.")
    except Exception as e:
        log.error(f"Singleton init failed: {e}")

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

    # API routes (includes admin sub-app mount)
    register_routes(app)

    # WebSocket
    app.add_api_websocket_route("/ws/stream", ws_stream_endpoint)

    # Health check (no auth)
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

# api/main.py
# GENESIS — FastAPI Application Factory
#
# CHANGES (MongoDB Rebuild):
#   • init_db() → connect_db() (Motor/Beanie)
#   • Auto-seed uses MongoDB Beanie queries (no SQLAlchemy)
#   • SessionMiddleware added for Google OAuth state
#   • OTP auth router registered
#   • Conversation router registered
#   • All SQLAlchemy/Alembic imports removed
#   • close_db() called on shutdown
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
from starlette.middleware.sessions import SessionMiddleware

from security.cors_config  import CORS_SETTINGS
from shared.exceptions     import GenesisError
from api.error_handlers    import genesis_exception_handler, generic_exception_handler
from api.middleware        import logging_middleware
from api.routes            import register_routes
from api.websocket         import ws_stream_endpoint
from database.mongo        import connect_db, close_db
from api.dependencies      import init_singletons

log = logging.getLogger("api.main")

FRONTEND_DIST      = Path(__file__).resolve().parent.parent / "frontend" / "dist"
_FALLBACK_PASSWORD = "Genesis@2024!"
_BLOCKED_PASSWORDS = {"", "changeme", "password"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""

    # MongoDB
    try:
        await connect_db()
        log.info("MongoDB connected and Beanie initialised.")
    except Exception as e:
        log.error(f"MongoDB init failed (non-fatal): {e}")

    # Admin password safety
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if admin_password in _BLOCKED_PASSWORDS:
        log.warning("ADMIN_PASSWORD not set or insecure — using built-in fallback.")
        os.environ["ADMIN_PASSWORD"] = _FALLBACK_PASSWORD

    # Auto-seed
    try:
        from database.models_mongo import User
        has_admin = await User.find_one(User.is_admin == True)
        if not has_admin:
            log.info("No admin user found — running seeds automatically.")
            from database.seeds_mongo import seed_all
            result = await seed_all()
            log.info(f"Auto-seed complete: {result}")
        else:
            log.info("Admin user exists — skipping auto-seed.")
    except Exception as e:
        log.error(f"Auto-seed failed (non-fatal): {e}")

    # Password reset hook
    if os.getenv("RESET_ADMIN_PASSWORD", "false").lower() == "true":
        try:
            from database.models_mongo import User
            from security.password_hash import hash_password
            new_pw    = os.getenv("ADMIN_PASSWORD", _FALLBACK_PASSWORD)
            admin_usr = os.getenv("ADMIN_USERNAME", "admin")
            admin = await User.find_one(User.username == admin_usr)
            if admin:
                admin.hashed_pw = hash_password(new_pw)
                await admin.save()
                log.info(f"RESET_ADMIN_PASSWORD: rehashed for '{admin.username}'")
        except Exception as e:
            log.error(f"Password reset failed (non-fatal): {e}")

    # Manual seed override
    if os.getenv("RUN_SEEDS", "false").lower() == "true":
        try:
            from database.seeds_mongo import seed_all
            await seed_all()
            log.info("Manual seed complete.")
        except Exception as e:
            log.error(f"Manual seed failed (non-fatal): {e}")

    # Singletons
    try:
        init_singletons(app)
        log.info("Singletons initialised.")
    except Exception as e:
        log.error(f"Singleton init failed: {e}")

    log.info(
        f"GENESIS starting | model={os.getenv('GEMMA_MODEL', 'default')} | "
        f"db=mongodb | port={os.getenv('PORT', '8080')}"
    )

    yield

    await close_db()
    log.info("GENESIS shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="GENESIS API",
        version="2.0.0",
        description="GENESIS AI — Self-Learning System (MongoDB Edition)",
        lifespan=lifespan,
    )

    app.add_middleware(CORSMiddleware, **CORS_SETTINGS)

    # SessionMiddleware for Google OAuth (must be before routes)
    app.add_middleware(
        SessionMiddleware,
        secret_key=os.getenv("SESSION_SECRET_KEY", "dev-fallback-change-in-prod"),
        same_site="lax",
        https_only=os.getenv("ENV", "development") == "production",
    )

    from starlette.middleware.base import BaseHTTPMiddleware
    app.add_middleware(BaseHTTPMiddleware, dispatch=logging_middleware)

    app.add_exception_handler(GenesisError, genesis_exception_handler)
    app.add_exception_handler(Exception,    generic_exception_handler)

    register_routes(app)

    app.add_api_websocket_route("/ws/stream", ws_stream_endpoint)

    @app.get("/health", include_in_schema=False)
    async def health():
        return {"status": "ok", "service": "genesis-api", "db": "mongodb"}

    @app.get("/", include_in_schema=False)
    async def root():
        if FRONTEND_DIST.exists():
            return FileResponse(str(FRONTEND_DIST / "index.html"))
        return {"message": "GENESIS API is running", "docs": "/docs", "health": "/health"}

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

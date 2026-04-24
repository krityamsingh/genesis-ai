# api/routes.py — Route registration (upgraded: Phase 5/6 routes added)
from fastapi import FastAPI


def register_routes(app: FastAPI):
    # ── Existing v1 routers (unchanged) ──────────────────────────────────────
    from api.v1.core_routes         import router as core_router
    from api.v1.module_routes       import router as module_router
    from api.v1.admin_routes        import router as admin_router
    from api.v1.auth_routes         import router as auth_router
    from api.v1.auth_routes_oauth   import router as oauth_router
    from api.v1.auth_otp_routes     import router as otp_router
    from api.v1.conversation_routes import router as conv_router
    from api.v1.panel_routes        import router as panel_router
    from api.v1.training_routes     import router as training_router

    # ── Phase 5 — new endpoints (feature-flagged internally) ─────────────────
    from api.v1.flags_routes        import router as flags_router
    from api.v1.memory_routes       import router as memory_router
    from api.v1.plugin_routes       import router as plugin_router

    # ── Phase 6 — usage + API keys ────────────────────────────────────────────
    from api.v1.usage_routes        import router as usage_router
    from api.v1.key_routes          import router as key_router

    prefix = "/api/v1"

    for r in [
        core_router, module_router, admin_router,
        auth_router, oauth_router, otp_router,
        conv_router, panel_router, training_router,
        flags_router, memory_router, plugin_router,
        usage_router, key_router,
    ]:
        app.include_router(r, prefix=prefix)

    # Admin sub-app — must be mounted AFTER include_router calls
    from admin.backend.admin_api import admin_app
    app.mount("/api/admin", admin_app)

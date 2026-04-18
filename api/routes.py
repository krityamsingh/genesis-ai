# api/routes.py — registers all routers onto the FastAPI app
#
# FIX APPLIED:
#   • Mounted admin_app sub-app at /api/admin so that
#     POST /api/admin/login (used by AdminLogin.jsx) actually resolves.
#     Previously the admin_app was imported in experimental_routes.py but
#     never registered, so every admin login attempt returned 404.
# =============================================================================

from fastapi import FastAPI
from api.v1.core_routes    import router as core_router
from api.v1.module_routes  import router as module_router
from api.v1.admin_routes   import router as admin_router
from api.v1.auth_routes    import router as auth_router
from api.v1.panel_routes   import router as panel_router


def register_routes(app: FastAPI):
    # v1 API routers
    app.include_router(core_router,   prefix="/api/v1")
    app.include_router(module_router, prefix="/api/v1")
    app.include_router(admin_router,  prefix="/api/v1")
    app.include_router(auth_router,   prefix="/api/v1")
    app.include_router(panel_router,  prefix="/api/v1")

    # Admin sub-app — must be mounted AFTER include_router calls so v1 routes
    # take priority over the catch-all mount.
    # Exposes: POST /api/admin/login, GET /api/admin/health, etc.
    from admin.backend.admin_api import admin_app
    app.mount("/api/admin", admin_app)

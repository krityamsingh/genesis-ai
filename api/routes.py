# api/routes.py — registers all routers onto the FastAPI app
#
# CHANGES (MongoDB Rebuild):
#   • Registered auth_otp_routes (OTP + name setup)
#   • Registered conversation_routes (full CRUD)
#   • Registered auth_routes_oauth (Google OAuth)
# =============================================================================

from fastapi import FastAPI
from api.v1.core_routes        import router as core_router
from api.v1.module_routes      import router as module_router
from api.v1.admin_routes       import router as admin_router
from api.v1.auth_routes        import router as auth_router
from api.v1.auth_routes_oauth  import router as oauth_router
from api.v1.auth_otp_routes    import router as otp_router
from api.v1.conversation_routes import router as conv_router
from api.v1.panel_routes       import router as panel_router


def register_routes(app: FastAPI):
    # v1 API routers
    app.include_router(core_router,   prefix="/api/v1")
    app.include_router(module_router, prefix="/api/v1")
    app.include_router(admin_router,  prefix="/api/v1")
    app.include_router(auth_router,   prefix="/api/v1")
    app.include_router(oauth_router,  prefix="/api/v1")
    app.include_router(otp_router,    prefix="/api/v1")
    app.include_router(conv_router,   prefix="/api/v1")
    app.include_router(panel_router,  prefix="/api/v1")

    # Admin sub-app — must be mounted AFTER include_router calls
    from admin.backend.admin_api import admin_app
    app.mount("/api/admin", admin_app)

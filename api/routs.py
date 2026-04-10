# api/routes.py — registers all routers onto the FastAPI app
from fastapi import FastAPI
from api.v1.core_routes   import router as core_router
from api.v1.module_routes import router as module_router
from api.v1.panel_routes  import router as panel_router
from api.v1.admin_routes  import router as admin_kgrouter


def register_routes(app: FastAPI):
    # Core AI endpoints
    app.include_router(core_router,   prefix="/api/v1")
    app.include_router(module_router, prefix="/api/v1")
    app.include_router(panel_router,  prefix="/api/v1")
    app.include_router(admin_kgrouter, prefix="/api/v1")

    # Mount the full admin sub-app at /api/v1/admin
    # (admin_api.py is a standalone FastAPI sub-app)
    from admin.backend.admin_api import admin_app
    app.mount("/api/v1/admin", admin_app)

# api/routes.py — registers all routers onto the FastAPI app
from fastapi import FastAPI

from api.v1.core_routes   import router as core_router
from api.v1.module_routes import router as module_router
from api.v1.panel_routes  import router as panel_router
from api.v1.auth_routes   import router as auth_router


def register_routes(app: FastAPI):
    # All v1 API routes under /api/v1
    app.include_router(auth_router,   prefix="/api/v1")   # /api/v1/auth/*
    app.include_router(core_router,   prefix="/api/v1")   # /api/v1/core/*
    app.include_router(module_router, prefix="/api/v1")   # /api/v1/modules/*
    app.include_router(panel_router,  prefix="/api/v1")   # /api/v1/panel/*

    # Admin sub-app mounted at /api/v1/admin
    # Must be mounted AFTER include_router calls so router paths take priority.
    from admin.backend.admin_api import admin_app
    app.mount("/api/v1/admin", admin_app)

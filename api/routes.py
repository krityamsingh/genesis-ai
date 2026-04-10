# api/routes.py — registers all routers onto the FastAPI app
from fastapi import FastAPI
from api.v1.core_routes    import router as core_router
from api.v1.module_routes  import router as module_router
from api.v1.admin_routes   import router as admin_router
from api.v1.auth_routes    import router as auth_router
from api.v1.panel_routes   import router as panel_router

def register_routes(app: FastAPI):
    # Register all routers under /api/v1 prefix to match frontend expectation
    app.include_router(core_router,   prefix="/api/v1")
    app.include_router(module_router, prefix="/api/v1")
    app.include_router(admin_router,  prefix="/api/v1")
    app.include_router(auth_router,   prefix="/api/v1")
    app.include_router(panel_router,  prefix="/api/v1")

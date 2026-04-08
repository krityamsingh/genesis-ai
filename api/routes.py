# api/routes.py — registers all routers onto the FastAPI app
from fastapi import FastAPI
from api.v1.core_routes   import router as core_router
from api.v1.module_routes import router as module_router

def register_routes(app: FastAPI):
    app.include_router(core_router)
    app.include_router(module_router)

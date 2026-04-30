"""
Register M7/M8/M9 routes onto the FastAPI app.
Called from api/routes.py register_routes() function.
"""
from fastapi import FastAPI
import logging

log = logging.getLogger("api.routes.new")

def register_new_module_routes(app: FastAPI):
    """Attach M7, M8, M9 routers if their modules are available."""
    try:
        from api.v1.multimodal_routes import router as multimodal_router
        app.include_router(multimodal_router, prefix="/api/v1")
        log.info("M7 Multimodal routes registered")
    except Exception as e:
        log.warning("M7 routes not loaded: %s", e)

    try:
        from api.v1.agent_routes import router as agent_router
        app.include_router(agent_router, prefix="/api/v1")
        log.info("M8 Agent routes registered")
    except Exception as e:
        log.warning("M8 routes not loaded: %s", e)

    try:
        from api.v1.interpreter_routes import router as interpreter_router
        app.include_router(interpreter_router, prefix="/api/v1")
        log.info("M9 Interpreter routes registered")
    except Exception as e:
        log.warning("M9 routes not loaded: %s", e)

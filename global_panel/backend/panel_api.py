# global_panel/backend/panel_api.py
# GENESIS — Global Panel API
#
# FIXES (Layer Linkage):
#   • All singleton getters now use FastAPI Depends() injection
#     instead of bare calls. Bare calls crash because these functions
#     require a FastAPI Request argument — they are Depends() targets,
#     not plain callables.
# =============================================================================

from __future__ import annotations
from fastapi import APIRouter, Depends
from api.dependencies import get_kg, get_m1, get_router, get_memory

router = APIRouter(prefix="/panel", tags=["global-panel"])


@router.get("/overview")
async def overview(
    kg     = Depends(get_kg),
    m1     = Depends(get_m1),
    router_= Depends(get_router),
    memory = Depends(get_memory),
):
    return {
        "kg":     kg.stats(),
        "m1":     m1.stats(),
        "router": router_.stats(),
        "memory": memory.stats(),
    }


@router.get("/kg/export")
async def export_kg(kg=Depends(get_kg)):
    from global_panel.backend.export_manager import export_kg_json
    return {"json": export_kg_json(kg)}

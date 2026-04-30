# api/v1/panel_routes.py
# GENESIS — System Panel Routes
#
# FIXES (Layer Linkage):
#   • All singleton getters now use FastAPI Depends() injection
#     instead of bare calls (get_kg(), get_m1(), etc.)
#     Bare calls fail because these functions require a Request argument.
# =============================================================================

from __future__ import annotations
from fastapi import APIRouter, Depends
from api.dependencies import get_kg, get_m1, get_router, get_memory

router = APIRouter(prefix="/panel", tags=["panel"])


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

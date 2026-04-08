# global_panel/backend/panel_api.py
from __future__ import annotations
from fastapi import APIRouter, Depends
from api.dependencies import get_kg, get_m1, get_router, get_memory

router = APIRouter(prefix="/panel", tags=["global-panel"])


@router.get("/overview")
async def overview():
    kg     = get_kg()
    m1     = get_m1()
    router_= get_router()
    memory = get_memory()
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

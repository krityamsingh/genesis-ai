# api/v1/panel_routes.py
from __future__ import annotations
from fastapi import APIRouter
from api.dependencies import get_kg, get_m1, get_router, get_memory

router = APIRouter(prefix="/panel", tags=["panel"])

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

# api/v1/memory_routes.py — User memory API (Phase 5)
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any
from api.dependencies import require_auth_dep

router = APIRouter(prefix="/memory", tags=["memory"])

class FactPayload(BaseModel):
    key: str; value: Any

class PrefPayload(BaseModel):
    key: str; value: Any

@router.get("/")
async def get_memory(current_user=Depends(require_auth_dep)):
    from config.feature_flags import flags
    if not flags.memory_enabled:
        return {"enabled": False}
    from services import memory_service
    return await memory_service.get_memory_dict(str(current_user.id))

@router.post("/facts")
async def set_fact(payload: FactPayload, current_user=Depends(require_auth_dep)):
    from services import memory_service
    await memory_service.set_fact(str(current_user.id), payload.key, payload.value)
    return {"ok": True}

@router.delete("/facts/{key}")
async def delete_fact(key: str, current_user=Depends(require_auth_dep)):
    from services import memory_service
    await memory_service.delete_fact(str(current_user.id), key)
    return {"ok": True}

@router.post("/preferences")
async def set_preference(payload: PrefPayload, current_user=Depends(require_auth_dep)):
    from services import memory_service
    await memory_service.set_preference(str(current_user.id), payload.key, payload.value)
    return {"ok": True}

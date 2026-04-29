from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from api.dependencies import require_auth_dep

router = APIRouter(prefix="/keys", tags=["api-keys"])

class CreateKeyRequest(BaseModel):
    name: str; scope: str = "full"; expire_days: Optional[int] = None

@router.post("/")
async def create_key(req: CreateKeyRequest, current_user=Depends(require_auth_dep)):
    from services import key_service
    return await key_service.create_key(str(current_user.id), req.name, req.scope, req.expire_days)

@router.get("/")
async def list_keys(current_user=Depends(require_auth_dep)):
    from services import key_service
    return await key_service.list_keys(str(current_user.id))

@router.delete("/{key_id}")
async def revoke_key(key_id: str, current_user=Depends(require_auth_dep)):
    from services import key_service
    await key_service.revoke_key(str(current_user.id), key_id); return {"ok": True}

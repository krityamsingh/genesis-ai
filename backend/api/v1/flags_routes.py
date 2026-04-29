# api/v1/flags_routes.py — Feature flag inspection (Phase 5)
from fastapi import APIRouter, Depends
from api.dependencies import require_auth_dep

router = APIRouter(prefix="/flags", tags=["feature-flags"])

@router.get("/")
async def get_flags(current_user=Depends(require_auth_dep)):
    from config.feature_flags import flags
    return flags.as_dict()

@router.post("/reload")
async def reload_flags(current_user=Depends(require_auth_dep)):
    if not getattr(current_user, "is_admin", False):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin required")
    from config.feature_flags import flags
    flags.reload()
    return {"ok": True, "flags": flags.as_dict()}

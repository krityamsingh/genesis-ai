from fastapi import APIRouter, Depends
from api.dependencies import require_auth_dep

router = APIRouter(prefix="/usage", tags=["usage"])

@router.get("/")
async def get_usage(current_user=Depends(require_auth_dep)):
    from services import usage_service
    return await usage_service.get_usage(str(current_user.id))

# api/v1/plugin_routes.py — Plugin management API (Phase 5)
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import require_auth_dep

router = APIRouter(prefix="/plugins", tags=["plugins"])

@router.get("/status")
async def plugins_status(current_user=Depends(require_auth_dep)):
    from config.feature_flags import flags
    if not flags.plugins_enabled:
        return {"enabled": False, "plugins": []}
    from core.plugins.registry import PluginRegistry
    return {"enabled": True, "plugins": PluginRegistry.instance().status()}

@router.post("/{name}/enable")
async def enable_plugin(name: str, current_user=Depends(require_auth_dep)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin required")
    from core.plugins.registry import PluginRegistry
    PluginRegistry.instance().enable(name)
    return {"ok": True}

@router.post("/{name}/disable")
async def disable_plugin(name: str, current_user=Depends(require_auth_dep)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin required")
    from core.plugins.registry import PluginRegistry
    PluginRegistry.instance().disable(name)
    return {"ok": True}

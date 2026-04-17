# api/v1/admin_routes.py
#
# FIX APPLIED:
#   • Added all routes called by the frontend's adminAPI in client.js:
#       GET  /admin/health
#       GET  /admin/users
#       POST /admin/users
#       DELETE /admin/users/{id}
#       GET  /admin/logs
#       GET  /admin/training/status
#       POST /admin/training/start
#       POST /admin/backup
#       GET  /admin/backups
#       GET  /admin/prompts
#       PUT  /admin/prompts/{id}
#   All were 404 before this fix.
#   • Existing KG/M1 management routes kept intact.
# =============================================================================

from __future__ import annotations

import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Optional

from security.permissions import require_admin
from api.dependencies     import get_kg, get_m1
from api.schemas          import OKResponse

log = logging.getLogger("api.v1.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Auth dependency ───────────────────────────────────────────────────────────

def _admin(authorization: Optional[str] = Header(None)) -> dict:
    return require_admin(
        authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    )


# ── Request bodies ────────────────────────────────────────────────────────────

class CreateUserBody(BaseModel):
    username: str
    email:    str
    password: str
    is_admin: bool = False


class TrainingBody(BaseModel):
    model_id:     str
    dataset_path: str
    config:       dict = {}


class SavePromptBody(BaseModel):
    body: str


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", dependencies=[Depends(_admin)])
async def health():
    """System health check used by admin panel dashboard."""
    try:
        from admin.backend.health_check import system_health
        # health_check doesn't need live singletons for basic checks
        return system_health()
    except Exception as e:
        log.warning(f"/admin/health helper unavailable: {e}")
        return {"status": "ok", "note": "health_check helper not available"}


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", dependencies=[Depends(_admin)])
async def list_users():
    from admin.backend.user_manager import list_users as _list_users
    return _list_users()


@router.post("/users", status_code=201, dependencies=[Depends(_admin)])
async def create_user(body: CreateUserBody):
    from admin.backend.user_manager import create_user as _create_user
    try:
        return _create_user(body.username, body.email, body.password, body.is_admin)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        log.error(f"create_user failed: {e}")
        raise HTTPException(status_code=400, detail="Could not create user.")


@router.delete("/users/{user_id}", dependencies=[Depends(_admin)])
async def delete_user(user_id: str):
    from admin.backend.user_manager import deactivate_user
    try:
        deactivate_user(user_id)
        return {"ok": True, "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Logs ──────────────────────────────────────────────────────────────────────

@router.get("/logs", dependencies=[Depends(_admin)])
async def logs(lines: int = 100):
    lines = min(lines, 1000)
    try:
        from admin.backend.logs_viewer import tail_log
        return {"lines": tail_log(n=lines)}
    except Exception as e:
        log.warning(f"/admin/logs helper error: {e}")
        return {"lines": [], "error": str(e)}


# ── Training ──────────────────────────────────────────────────────────────────

@router.get("/training/status", dependencies=[Depends(_admin)])
async def training_status():
    """Return the status of the most recent training task."""
    try:
        from tasks.celery_app import celery_app
        inspect = celery_app.control.inspect()
        active  = inspect.active() or {}
        return {"active_tasks": active, "status": "ok"}
    except Exception as e:
        log.warning(f"training/status celery unavailable: {e}")
        return {"active_tasks": {}, "status": "celery_unavailable", "error": str(e)}


@router.post("/training/start", dependencies=[Depends(_admin)])
async def start_training(body: TrainingBody):
    from admin.backend.trainer import start_training as _start
    try:
        return _start(body.model_id, body.dataset_path, body.config)
    except Exception as e:
        log.error(f"start_training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Backup ────────────────────────────────────────────────────────────────────

@router.post("/backup", dependencies=[Depends(_admin)])
async def backup(kg=Depends(get_kg)):
    from admin.backend.backup_manager import backup_kg
    path = backup_kg(kg)
    return {"backup_path": path, "ok": True}


@router.get("/backups", dependencies=[Depends(_admin)])
async def list_backups():
    backup_dir = "/tmp/genesis_backups"
    try:
        if not os.path.isdir(backup_dir):
            return {"backups": []}
        entries = sorted(os.listdir(backup_dir), reverse=True)
        return {"backups": entries}
    except Exception as e:
        return {"backups": [], "error": str(e)}


# ── Prompts ───────────────────────────────────────────────────────────────────

@router.get("/prompts", dependencies=[Depends(_admin)])
async def prompts(n: int = 50):
    n = min(n, 500)
    try:
        from admin.backend.prompt_manager import get_recent_prompts
        return get_recent_prompts(n)
    except Exception as e:
        log.warning(f"/admin/prompts error: {e}")
        return []


@router.put("/prompts/{prompt_id}", dependencies=[Depends(_admin)])
async def save_prompt(prompt_id: str, body: SavePromptBody):
    """
    Persist a manually edited prompt body.
    Writes to the prompts/ directory — prompt_id maps to a filename.
    """
    import re
    from pathlib import Path

    # Sanitise prompt_id to prevent path traversal
    safe_id = re.sub(r"[^a-zA-Z0-9_\-]", "", prompt_id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Invalid prompt id.")

    prompts_dir = Path(__file__).resolve().parent.parent.parent / "prompts"
    prompts_dir.mkdir(parents=True, exist_ok=True)
    target = prompts_dir / f"{safe_id}.txt"

    try:
        target.write_text(body.body, encoding="utf-8")
        log.info(f"Prompt saved: {safe_id}")
        return {"ok": True, "prompt_id": safe_id}
    except Exception as e:
        log.error(f"save_prompt failed: {e}")
        raise HTTPException(status_code=500, detail="Could not save prompt.")


# ── KG management (kept from original) ───────────────────────────────────────

@router.get("/kg/stats", dependencies=[Depends(_admin)])
async def kg_stats(kg=Depends(get_kg)):
    return kg.stats()


@router.post("/kg/reset/{collection}", response_model=OKResponse,
             dependencies=[Depends(_admin)])
async def kg_reset(collection: str, kg=Depends(get_kg)):
    kg.reset(collection)
    return OKResponse(message=f"Collection '{collection}' cleared.")


@router.post("/kg/reset-all", response_model=OKResponse,
             dependencies=[Depends(_admin)])
async def kg_reset_all(kg=Depends(get_kg)):
    kg.reset_all()
    return OKResponse(message="All KG collections cleared.")


@router.get("/m1/stats", dependencies=[Depends(_admin)])
async def m1_stats(m1=Depends(get_m1)):
    return m1.stats()

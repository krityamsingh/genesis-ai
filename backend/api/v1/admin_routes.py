# api/v1/admin_routes.py
# GENESIS — Admin API Endpoints (MongoDB/Beanie)
#
# CHANGES (MongoDB Rebuild):
#   • list_users, create_user, delete_user → async Beanie calls
#   • GET  /admin/login-history  — new endpoint (all user sessions)
#   • GET  /admin/login-history/export  — CSV export
#   • promote_to_admin / revoke_admin endpoints added
#   • prompts endpoint → async Beanie PromptLog queries
#   • All other routes kept intact

from __future__ import annotations

import csv
import io
import logging
import os
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from security.permissions  import require_admin
from api.dependencies      import get_kg, get_m1
from api.schemas           import OKResponse

log = logging.getLogger("api.v1.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin(authorization: Optional[str] = Header(None)) -> dict:
    return require_admin(
        authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    )


# ── Schemas ───────────────────────────────────────────────────────────────────

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
    try:
        from admin.backend.health_check import system_health
        return system_health()
    except Exception as e:
        log.warning(f"/admin/health helper unavailable: {e}")
        return {"status": "ok", "note": "health_check helper not available"}


# ── Users (Beanie) ────────────────────────────────────────────────────────────

@router.get("/users", dependencies=[Depends(_admin)])
async def list_users():
    from database.models_mongo import User, LoginSession
    users = await User.find_all().to_list()
    result = []
    for u in users:
        session_count = await LoginSession.find(LoginSession.user_id == str(u.id)).count()
        result.append({
            "id":           str(u.id),
            "username":     u.username,
            "email":        u.email,
            "phone":        u.phone,
            "display_name": u.display_name,
            "google_id":    u.google_id,
            "avatar_url":   u.avatar_url,
            "is_admin":     u.is_admin,
            "is_active":    u.is_active,
            "last_login":   u.last_login.isoformat() if u.last_login else None,
            "created_at":   u.created_at.isoformat(),
            "session_count": session_count,
        })
    return result


@router.post("/users", status_code=201, dependencies=[Depends(_admin)])
async def create_user(body: CreateUserBody):
    from database.models_mongo import User
    from security.password_hash import hash_password

    if await User.find_one(User.username == body.username):
        raise HTTPException(status_code=422, detail="Username already exists.")
    if body.email and await User.find_one(User.email == body.email):
        raise HTTPException(status_code=422, detail="Email already exists.")

    user = User(
        username=body.username,
        email=body.email,
        hashed_pw=hash_password(body.password),
        is_admin=body.is_admin,
        is_active=True,
    )
    await user.insert()
    log.info(f"Admin created user: {body.username}")
    return {"id": str(user.id), "username": user.username}


@router.delete("/users/{user_id}", dependencies=[Depends(_admin)])
async def delete_user(user_id: str):
    from database.models_mongo import User
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    await user.save()
    return {"ok": True, "user_id": user_id}


@router.post("/users/{user_id}/promote", dependencies=[Depends(_admin)])
async def promote_to_admin(user_id: str):
    from database.models_mongo import User
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_admin = True
    await user.save()
    return {"ok": True, "user_id": user_id, "is_admin": True}


@router.post("/users/{user_id}/demote", dependencies=[Depends(_admin)])
async def revoke_admin(user_id: str):
    from database.models_mongo import User
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_admin = False
    await user.save()
    return {"ok": True, "user_id": user_id, "is_admin": False}


# ── Login History (NEW) ───────────────────────────────────────────────────────

@router.get("/login-history", dependencies=[Depends(_admin)])
async def login_history(
    method:    Optional[str] = None,   # google | otp | password
    user_id:   Optional[str] = None,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    limit:     int = 50,
    offset:    int = 0,
):
    """Return paginated login sessions across all users with optional filters."""
    from database.models_mongo import LoginSession
    from datetime import datetime

    query = LoginSession.find()

    if method:
        query = query.find(LoginSession.login_method == method)
    if user_id:
        query = query.find(LoginSession.user_id == user_id)
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            query = query.find(LoginSession.logged_in_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.find(LoginSession.logged_in_at <= dt)
        except ValueError:
            pass

    total    = await query.count()
    sessions = await query.sort(-LoginSession.logged_in_at).skip(offset).limit(min(limit, 200)).to_list()

    def _duration(s):
        if s.logged_out_at and s.logged_in_at:
            secs = int((s.logged_out_at - s.logged_in_at).total_seconds())
            h, rem = divmod(secs, 3600)
            m, _   = divmod(rem, 60)
            return f"{h}h {m}m" if h else f"{m}m"
        return "Active" if s.is_active else "Unknown"

    return {
        "total":  total,
        "offset": offset,
        "limit":  limit,
        "sessions": [
            {
                "id":           str(s.id),
                "user_id":      s.user_id,
                "user_name":    s.user_name,
                "user_email":   s.user_email,
                "login_method": s.login_method,
                "ip_address":   s.ip_address,
                "user_agent":   s.user_agent,
                "logged_in_at": s.logged_in_at.isoformat(),
                "logged_out_at": s.logged_out_at.isoformat() if s.logged_out_at else None,
                "is_active":    s.is_active,
                "duration":     _duration(s),
            }
            for s in sessions
        ],
    }


@router.get("/login-history/export", dependencies=[Depends(_admin)])
async def export_login_history(
    method:    Optional[str] = None,
    user_id:   Optional[str] = None,
):
    """Stream a CSV of all login sessions matching the filters."""
    from database.models_mongo import LoginSession

    query = LoginSession.find()
    if method:
        query = query.find(LoginSession.login_method == method)
    if user_id:
        query = query.find(LoginSession.user_id == user_id)

    sessions = await query.sort(-LoginSession.logged_in_at).to_list()

    def _stream():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "id", "user_name", "user_email", "login_method",
            "ip_address", "logged_in_at", "logged_out_at", "is_active",
        ])
        for s in sessions:
            writer.writerow([
                str(s.id), s.user_name, s.user_email, s.login_method,
                s.ip_address,
                s.logged_in_at.isoformat(),
                s.logged_out_at.isoformat() if s.logged_out_at else "",
                s.is_active,
            ])
        yield buf.getvalue()

    return StreamingResponse(
        _stream(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=login_history.csv"},
    )


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


# ── Prompts (Beanie) ──────────────────────────────────────────────────────────

@router.get("/prompts", dependencies=[Depends(_admin)])
async def prompts(n: int = 50):
    from database.models_mongo import PromptLog
    n = min(n, 500)
    logs_list = await PromptLog.find_all().sort(-PromptLog.created_at).limit(n).to_list()
    return [
        {
            "id":         str(l.id),
            "module":     l.module,
            "prompt":     l.prompt[:200],
            "response":   l.response[:200],
            "latency_ms": l.latency_ms,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs_list
    ]


@router.delete("/prompts", dependencies=[Depends(_admin)])
async def clear_prompts():
    from database.models_mongo import PromptLog
    await PromptLog.find_all().delete()
    return {"ok": True, "message": "All prompt logs cleared."}


@router.put("/prompts/{prompt_id}", dependencies=[Depends(_admin)])
async def save_prompt(prompt_id: str, body: SavePromptBody):
    import re
    from pathlib import Path
    safe_id = re.sub(r"[^a-zA-Z0-9_\-]", "", prompt_id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Invalid prompt id.")
    prompts_dir = Path(__file__).resolve().parent.parent.parent / "prompts"
    prompts_dir.mkdir(parents=True, exist_ok=True)
    try:
        (prompts_dir / f"{safe_id}.txt").write_text(body.body, encoding="utf-8")
        return {"ok": True, "prompt_id": safe_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not save prompt.")


# ── Training ──────────────────────────────────────────────────────────────────

@router.get("/training/status", dependencies=[Depends(_admin)])
async def training_status():
    try:
        from tasks.celery_app import celery_app
        active = celery_app.control.inspect().active() or {}
        return {"active_tasks": active, "status": "ok"}
    except Exception as e:
        return {"active_tasks": {}, "status": "celery_unavailable", "error": str(e)}


@router.post("/training/start", dependencies=[Depends(_admin)])
async def start_training(body: TrainingBody):
    from admin.backend.trainer import start_training as _start
    try:
        return _start(body.model_id, body.dataset_path, body.config)
    except Exception as e:
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
        return {"backups": sorted(os.listdir(backup_dir), reverse=True)}
    except Exception as e:
        return {"backups": [], "error": str(e)}


# ── KG management (kept intact) ───────────────────────────────────────────────

@router.get("/kg/stats", dependencies=[Depends(_admin)])
async def kg_stats(kg=Depends(get_kg)):
    return kg.stats()


@router.post("/kg/reset/{collection}", response_model=OKResponse, dependencies=[Depends(_admin)])
async def kg_reset(collection: str, kg=Depends(get_kg)):
    kg.reset(collection)
    return OKResponse(message=f"Collection '{collection}' cleared.")


@router.post("/kg/reset-all", response_model=OKResponse, dependencies=[Depends(_admin)])
async def kg_reset_all(kg=Depends(get_kg)):
    kg.reset_all()
    return OKResponse(message="All KG collections cleared.")


@router.get("/m1/stats", dependencies=[Depends(_admin)])
async def m1_stats(m1=Depends(get_m1)):
    return m1.stats()

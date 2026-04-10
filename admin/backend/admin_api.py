# admin/backend/admin_api.py — FastAPI sub-app for admin panel
from __future__ import annotations
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional

from admin.backend.auth              import admin_login
from admin.backend.health_check      import system_health
from admin.backend.model_monitor     import model_info
from admin.backend.module_controller import get_module_states, set_module_enabled
from admin.backend.user_manager      import list_users, create_user, deactivate_user
from admin.backend.logs_viewer       import tail_log
from admin.backend.backup_manager    import backup_kg
from admin.backend.dataset_manager   import list_datasets, delete_dataset
from admin.backend.prompt_manager    import get_recent_prompts, clear_prompt_logs
from admin.backend.trainer           import start_training
from api.dependencies                import get_engine, get_kg, get_memory
from security.permissions            import require_admin


admin_app = FastAPI(title="GENESIS Admin", version="1.0.0")


# ── Auth helper ───────────────────────────────────────────────────────────────
def _auth(authorization: Optional[str] = Header(None)):
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    return require_admin(token)


# ── Pydantic bodies ───────────────────────────────────────────────────────────
class CreateUserBody(BaseModel):
    username: str
    email: str
    password: str
    is_admin: bool = False


class TrainingBody(BaseModel):
    model_id: str
    dataset_path: str
    config: dict = {}


# ── Auth ──────────────────────────────────────────────────────────────────────
@admin_app.post("/login")
async def login(username: str, password: str):
    try:
        token = admin_login(username, password)
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# ── System ────────────────────────────────────────────────────────────────────
@admin_app.get("/health")
async def health(_=Depends(_auth)):
    return system_health(get_kg(), get_engine(), get_memory())


@admin_app.get("/stats")
async def stats(_=Depends(_auth)):
    kg     = get_kg()
    engine = get_engine()
    memory = get_memory()
    return {
        "kg":     kg.stats(),
        "memory": memory.stats(),
        "engine": str(engine),
    }


# ── Model ─────────────────────────────────────────────────────────────────────
@admin_app.get("/model")
async def model(_=Depends(_auth)):
    return model_info(get_engine())


# ── Modules ───────────────────────────────────────────────────────────────────
@admin_app.get("/modules")
async def modules(_=Depends(_auth)):
    return get_module_states()


@admin_app.put("/modules/{key}")
async def toggle_module(key: str, enabled: bool, _=Depends(_auth)):
    set_module_enabled(key, enabled)
    return {"ok": True, "module": key, "enabled": enabled}


# ── Users ─────────────────────────────────────────────────────────────────────
@admin_app.get("/users")
async def users(_=Depends(_auth)):
    return list_users()


@admin_app.post("/users")
async def add_user(body: CreateUserBody, _=Depends(_auth)):
    try:
        result = create_user(body.username, body.email, body.password, body.is_admin)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@admin_app.delete("/users/{user_id}")
async def remove_user(user_id: str, _=Depends(_auth)):
    try:
        deactivate_user(user_id)
        return {"ok": True, "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Logs ──────────────────────────────────────────────────────────────────────
@admin_app.get("/logs")
async def logs(n: int = 100, _=Depends(_auth)):
    return {"lines": tail_log(n=n)}


# ── Backup ────────────────────────────────────────────────────────────────────
@admin_app.post("/backup")
async def backup(_=Depends(_auth)):
    path = backup_kg(get_kg())
    return {"backup_path": path}


# ── Datasets ──────────────────────────────────────────────────────────────────
@admin_app.get("/datasets")
async def datasets(_=Depends(_auth)):
    return list_datasets()


@admin_app.delete("/datasets/{name}")
async def del_dataset(name: str, _=Depends(_auth)):
    delete_dataset(name)
    return {"ok": True, "dataset": name}


# ── Prompts ───────────────────────────────────────────────────────────────────
@admin_app.get("/prompts")
async def prompts(n: int = 50, _=Depends(_auth)):
    return get_recent_prompts(n)


@admin_app.delete("/prompts")
async def clear_prompts(_=Depends(_auth)):
    clear_prompt_logs()
    return {"ok": True}


# ── Training ──────────────────────────────────────────────────────────────────
@admin_app.post("/training/start")
async def start_train(body: TrainingBody, _=Depends(_auth)):
    result = start_training(body.model_id, body.dataset_path, body.config)
    return result

# admin/backend/admin_api.py
# GENESIS — Admin Panel FastAPI Sub-App
#
# Fixes applied:
#   • Login credentials moved from query params → Pydantic request body
#     (query params are logged in plaintext everywhere; body is not)
#   • Consistent timing-safe response on auth failure to prevent user enumeration
#   • Rate-limiting on the login endpoint
#   • All admin routes require Bearer token via _auth dependency
#   • Structured error responses with consistent shape
# =============================================================================

from __future__ import annotations

import logging
import time

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from pydantic import BaseModel, EmailStr, field_validator
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
from security.rate_limiter           import check_rate_limit, RateLimitError

log = logging.getLogger("admin.api")

admin_app = FastAPI(
    title="GENESIS Admin API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)


# ── Pydantic request bodies ───────────────────────────────────────────────────

class LoginBody(BaseModel):
    """
    Admin login credentials.
    Sent as JSON body — never as query params — so credentials
    are not logged by any server, proxy, or browser history.
    """
    username: str
    password: str

    @field_validator("username", "password")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()


class CreateUserBody(BaseModel):
    username: str
    email:    str
    password: str
    is_admin: bool = False

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ToggleModuleBody(BaseModel):
    enabled: bool


class TrainingBody(BaseModel):
    model_id:     str
    dataset_path: str
    config:       dict = {}


# ── Auth dependency ───────────────────────────────────────────────────────────

def _auth(authorization: Optional[str] = Header(None)) -> dict:
    """Extract Bearer token from Authorization header and verify admin claim."""
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    return require_admin(token)


# ── Login ─────────────────────────────────────────────────────────────────────

@admin_app.post("/login", summary="Admin login — returns Bearer token")
async def login(body: LoginBody, request: Request):
    """
    Authenticate with admin credentials.

    Accepts JSON body with `username` and `password`.
    Returns `{ access_token, token_type }` on success.

    Rate-limited to 10 attempts per minute per IP to prevent brute force.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key  = f"admin_login:{client_ip}"

    try:
        check_rate_limit(rate_key, limit=10)
    except RateLimitError:
        log.warning(f"Admin login rate limit exceeded for IP={client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please wait before trying again.",
            headers={"Retry-After": "60"},
        )

    try:
        token = admin_login(body.username, body.password)
        log.info(f"Admin login success: username={body.username} ip={client_ip}")
        return {"access_token": token, "token_type": "bearer"}

    except Exception as e:
        # Constant-time sleep to prevent timing-based user enumeration
        time.sleep(0.3)
        log.warning(f"Admin login failed: username={body.username} ip={client_ip} reason={e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials.",
        )


# ── System ────────────────────────────────────────────────────────────────────

@admin_app.get("/health")
async def health(_: dict = Depends(_auth)):
    return system_health(get_kg(), get_engine(), get_memory())


@admin_app.get("/stats")
async def stats(_: dict = Depends(_auth)):
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
async def model(_: dict = Depends(_auth)):
    return model_info(get_engine())


# ── Modules ───────────────────────────────────────────────────────────────────

@admin_app.get("/modules")
async def modules(_: dict = Depends(_auth)):
    return get_module_states()


@admin_app.put("/modules/{key}")
async def toggle_module(key: str, body: ToggleModuleBody, _: dict = Depends(_auth)):
    set_module_enabled(key, body.enabled)
    return {"ok": True, "module": key, "enabled": body.enabled}


# ── Users ─────────────────────────────────────────────────────────────────────

@admin_app.get("/users")
async def users(_: dict = Depends(_auth)):
    return list_users()


@admin_app.post("/users", status_code=201)
async def add_user(body: CreateUserBody, _: dict = Depends(_auth)):
    try:
        result = create_user(body.username, body.email, body.password, body.is_admin)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        log.error(f"create_user failed: {e}")
        raise HTTPException(status_code=400, detail="Could not create user.")


@admin_app.delete("/users/{user_id}")
async def remove_user(user_id: str, _: dict = Depends(_auth)):
    try:
        deactivate_user(user_id)
        return {"ok": True, "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Logs ──────────────────────────────────────────────────────────────────────

@admin_app.get("/logs")
async def logs(n: int = 100, _: dict = Depends(_auth)):
    n = min(n, 1000)  # cap at 1000 lines
    return {"lines": tail_log(n=n)}


# ── Backup ────────────────────────────────────────────────────────────────────

@admin_app.post("/backup")
async def backup(_: dict = Depends(_auth)):
    path = backup_kg(get_kg())
    return {"backup_path": path}


# ── Datasets ──────────────────────────────────────────────────────────────────

@admin_app.get("/datasets")
async def datasets(_: dict = Depends(_auth)):
    return list_datasets()


@admin_app.delete("/datasets/{name}")
async def del_dataset(name: str, _: dict = Depends(_auth)):
    delete_dataset(name)
    return {"ok": True, "dataset": name}


# ── Prompts ───────────────────────────────────────────────────────────────────

@admin_app.get("/prompts")
async def prompts(n: int = 50, _: dict = Depends(_auth)):
    n = min(n, 500)
    return get_recent_prompts(n)


@admin_app.delete("/prompts")
async def clear_prompts(_: dict = Depends(_auth)):
    clear_prompt_logs()
    return {"ok": True}


# ── Training ──────────────────────────────────────────────────────────────────

@admin_app.post("/training/start")
async def start_train(body: TrainingBody, _: dict = Depends(_auth)):
    result = start_training(body.model_id, body.dataset_path, body.config)
    return result


# ── Knowledge Graph management ────────────────────────────────────────────────

@admin_app.get("/kg/stats")
async def kg_stats(_: dict = Depends(_auth)):
    return get_kg().stats()


@admin_app.post("/kg/reset/{collection}")
async def kg_reset(collection: str, _: dict = Depends(_auth)):
    get_kg().reset(collection)
    return {"ok": True, "message": f"Collection '{collection}' cleared."}


@admin_app.post("/kg/reset-all")
async def kg_reset_all(_: dict = Depends(_auth)):
    get_kg().reset_all()
    return {"ok": True, "message": "All KG collections cleared."}


@admin_app.get("/m1/stats")
async def m1_stats(_: dict = Depends(_auth)):
    from api.dependencies import get_m1
    return get_m1().stats()

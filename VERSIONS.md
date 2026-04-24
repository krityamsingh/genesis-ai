# GENESIS Version Registry

## v2.x (frozen baseline — do not modify files listed here without a checkpoint)
Entry point : `api.main:app`  (uvicorn api.main:app)
DB          : MongoDB / Beanie
Auth        : JWT (security/jwt_handler.py)
Routing     : core/router.py (keyword-based)

### Canonical files (api/ is authoritative)
- api/main.py          ← ONLY app factory
- api/routes.py        ← ONLY route registry
- api/schemas.py       ← ONLY schema source
- api/cache.py         ← ONLY cache module
- api/websocket.py     ← ONLY WebSocket handler
- api/dependencies.py  ← ONLY dependency injectors

### Root-level files (STALE — kept for now, removed in Phase 1 Step 1)
- main.py        — shadow of api/main.py, imports from wrong dependencies
- routes.py      — near-identical to api/routes.py
- schemas.py     — identical to api/schemas.py
- cache.py       — identical to api/cache.py
- websocket.py   — diverged from api/websocket.py
- dependencies.py — diverged: has both sync+async require_auth_dep
- middleware.py  — identical to api/middleware.py
- error_handlers.py — identical to api/error_handlers.py
- index.py       — stale entry shim

## v3.x (incremental upgrade — in progress)
See UPGRADE_PLAN.md for phase/step status.

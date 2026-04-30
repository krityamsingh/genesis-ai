# api/v1/module_routes.py
# GENESIS — Module Routes (MongoDB/Beanie)
#
# CHANGES (MongoDB Rebuild):
#   • Module enable/disable now persists in MongoDB (ModuleState collection)
#     instead of in-memory dict — survives server restarts.
#   • Falls back to in-memory registry if DB is unavailable.

from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from api.dependencies import get_m1
from api.schemas      import OKResponse

log = logging.getLogger("api.v1.modules")

router = APIRouter(prefix="/modules", tags=["modules"])

# ── Default module definitions (used to seed DB if states missing) ─────────────

_DEFAULT_MODULES = {
    "m1_self_learner":    {"name": "Self Learner",        "description": "Ingests and learns from any source.", "enabled": True},
    "m2_research_accel":  {"name": "Research Accelerator","description": "Parses papers and generates hypotheses.", "enabled": False},
    "m3_ai_builder":      {"name": "AI Builder",          "description": "Designs and generates ML architectures.", "enabled": False},
    "m4_time_reconstruct":{"name": "Time Reconstructor",  "description": "Reconstructs timelines and projects futures.", "enabled": False},
    "m5_intuition_engine":{"name": "Intuition Engine",    "description": "Bayesian reasoning and gap-filling.", "enabled": False},
    "m6_reality_sim":     {"name": "Reality Simulator",   "description": "Runs simulations and analyses results.", "enabled": False},
}


async def _get_states() -> dict[str, dict]:
    """Load module states from MongoDB, merging with default definitions."""
    try:
        from database.models_mongo import ModuleState
        db_states = await ModuleState.find_all().to_list()
        db_map = {s.module_key: s.enabled for s in db_states}
    except Exception as e:
        log.warning(f"Could not read ModuleState from DB: {e}")
        db_map = {}

    result = {}
    for key, defn in _DEFAULT_MODULES.items():
        result[key] = {
            "id":          key,
            "name":        defn["name"],
            "description": defn["description"],
            "enabled":     db_map.get(key, defn["enabled"]),
        }
    return result


class ToggleBody(BaseModel):
    enabled: bool


@router.get("/")
async def list_modules():
    """List all modules with their current enabled state (from MongoDB)."""
    modules = list((await _get_states()).values())
    return {
        "modules": modules,
        "active":  [m["id"] for m in modules if m["enabled"]],
    }


@router.get("/{module_id}")
async def get_module(module_id: str):
    """Return metadata and status for a single module."""
    states = await _get_states()
    if module_id not in states:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found.")
    return states[module_id]


@router.patch("/{module_id}")
async def toggle_module(module_id: str, body: ToggleBody):
    """Enable or disable a module. Persists to MongoDB."""
    if module_id not in _DEFAULT_MODULES:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found.")
    try:
        from database.models_mongo import ModuleState
        state = await ModuleState.find_one(ModuleState.module_key == module_id)
        if state:
            state.enabled    = body.enabled
            state.updated_at = datetime.utcnow()
            await state.save()
        else:
            await ModuleState(module_key=module_id, enabled=body.enabled).insert()
        log.info(f"Module {module_id} {'enabled' if body.enabled else 'disabled'}")
    except Exception as e:
        log.error(f"Failed to persist module state: {e}")
        raise HTTPException(status_code=500, detail="Failed to save module state.")

    return {"id": module_id, "enabled": body.enabled, "ok": True}

# admin/backend/module_controller.py — MongoDB/Beanie version
from __future__ import annotations
from datetime import datetime
from database.models_mongo import ModuleState


async def get_module_states() -> list[dict]:
    states = await ModuleState.find_all().to_list()
    return [
        {
            "module_key": s.module_key,
            "enabled":    s.enabled,
            "config":     s.config,
            "updated_at": s.updated_at.isoformat(),
        }
        for s in states
    ]


async def set_module_enabled(module_key: str, enabled: bool):
    state = await ModuleState.find_one(ModuleState.module_key == module_key)
    if state:
        state.enabled    = enabled
        state.updated_at = datetime.utcnow()
        await state.save()

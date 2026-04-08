# admin/backend/module_controller.py
from __future__ import annotations
from database.db     import db_session
from database.models import ModuleState
import time


def get_module_states() -> list[dict]:
    with db_session() as db:
        states = db.query(ModuleState).all()
        return [{"module_key": s.module_key, "enabled": s.enabled,
                 "config": s.config, "updated_at": s.updated_at}
                for s in states]


def set_module_enabled(module_key: str, enabled: bool):
    with db_session() as db:
        state = db.query(ModuleState).filter_by(module_key=module_key).first()
        if state:
            state.enabled    = enabled
            state.updated_at = time.time()

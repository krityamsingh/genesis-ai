# database/seeds.py
# GENESIS — Seed default data

from __future__ import annotations
import uuid
from database.db import db_session, init_db
from database.models import User, ModuleState
from security.password_hash import hash_password


def seed_all():
    init_db()
    with db_session() as db:
        _seed_admin(db)
        _seed_module_states(db)
    print("[Seeds] Done.")


def _seed_admin(db):
    import os
    username = os.getenv("ADMIN_USERNAME", "admin")
    if db.query(User).filter_by(username=username).first():
        return
    admin = User(
        id        = str(uuid.uuid4()),
        username  = username,
        email     = os.getenv("ADMIN_EMAIL", "admin@genesis.local"),
        hashed_pw = hash_password(os.getenv("ADMIN_PASSWORD", "changeme")),
        is_admin  = True,
    )
    db.add(admin)
    print(f"[Seeds] Created admin user: {username}")


def _seed_module_states(db):
    for key in ("m1", "m2", "m3", "m4", "m5", "m6"):
        if not db.query(ModuleState).filter_by(module_key=key).first():
            db.add(ModuleState(module_key=key, enabled=(key == "m1")))
    print("[Seeds] Module states seeded.")


if __name__ == "__main__":
    seed_all()

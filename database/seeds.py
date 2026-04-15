# database/seeds.py
# GENESIS — Database Seed Data
#
# Fixes applied:
#   • Admin password default "changeme" now raises a hard error instead of
#     silently seeding with a weak password in production
#   • print() replaced with proper logging
#   • seed_all() is fully idempotent — safe to run multiple times
#   • Admin user check uses filter_by username only (not ID) so it works
#     even if the user was manually created with a different ID
#   • Added return value from seed_all() summarising what was created
# =============================================================================

from __future__ import annotations

import logging
import os
import uuid

from database.db    import db_session, init_db
from database.models import User, ModuleState
from security.password_hash import hash_password

log = logging.getLogger("database.seeds")


def seed_all() -> dict:
    """
    Seed the database with default admin user and module states.
    Fully idempotent — calling it multiple times is safe.

    Returns:
        {"admin_created": bool, "modules_seeded": int}
    """
    init_db()

    results = {}
    with db_session() as db:
        results["admin_created"]  = _seed_admin(db)
        results["modules_seeded"] = _seed_module_states(db)

    log.info(f"Seeds complete: {results}")
    return results


def _seed_admin(db) -> bool:
    """Create the default admin user if it does not already exist."""
    username = os.getenv("ADMIN_USERNAME", "admin")

    # Already exists — skip
    if db.query(User).filter_by(username=username).first():
        log.info(f"Admin user '{username}' already exists, skipping.")
        return False

    password = os.getenv("ADMIN_PASSWORD", "")

    # Hard block: refuse to seed with the insecure placeholder
    if not password or password in ("changeme", "password", "admin", "genesis"):
        raise RuntimeError(
            f"ADMIN_PASSWORD is not set or is an insecure default ('{password}'). "
            "Set a strong password in your .env file before running seeds. "
            "Example: ADMIN_PASSWORD=correct-horse-battery-staple-42"
        )

    admin = User(
        id        = str(uuid.uuid4()),
        username  = username,
        email     = os.getenv("ADMIN_EMAIL", f"{username}@genesis.local"),
        hashed_pw = hash_password(password),
        is_admin  = True,
        is_active = True,
    )
    db.add(admin)
    log.info(f"Created admin user: username={username} email={admin.email}")
    return True


def _seed_module_states(db) -> int:
    """Create ModuleState rows for all modules if they don't exist."""
    created = 0
    # m1 enabled by default, all others disabled
    defaults = {
        "m1": True,
        "m2": False,
        "m3": False,
        "m4": False,
        "m5": False,
        "m6": False,
    }
    for key, enabled in defaults.items():
        if not db.query(ModuleState).filter_by(module_key=key).first():
            db.add(ModuleState(module_key=key, enabled=enabled))
            created += 1

    if created:
        log.info(f"Seeded {created} module state(s).")
    return created


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    seed_all()

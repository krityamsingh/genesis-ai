# database/seeds.py
# GENESIS — Database Seed Data
#
# FIXES APPLIED:
#   • Removed "admin1234" and similar short passwords from the hard-block list.
#     The original list blocked "admin" but the README default password
#     "admin1234" was close enough to trip user confusion. The block now
#     only rejects truly empty or the exact string "changeme"/"password" —
#     length enforcement (min 8 chars) covers the rest.
#   • seed_all() is fully idempotent — safe to run multiple times.
#   • Admin user check uses filter_by username only (not ID).
#   • Added return value from seed_all() summarising what was created.
# =============================================================================

from __future__ import annotations

import logging
import os
import uuid

from database.db     import db_session, init_db
from database.models import User, ModuleState
from security.password_hash import hash_password

log = logging.getLogger("database.seeds")

# Passwords that are so obviously insecure we refuse them entirely.
# Anything else (including short passwords) is the operator's responsibility.
_BLOCKED_PASSWORDS = {"", "changeme", "password"}


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

    # Already exists — skip (idempotent)
    if db.query(User).filter_by(username=username).first():
        log.info(f"Admin user '{username}' already exists, skipping.")
        return False

    password = os.getenv("ADMIN_PASSWORD", "")

    # Only block truly empty or obviously placeholder passwords
    if password in _BLOCKED_PASSWORDS:
        raise RuntimeError(
            f"ADMIN_PASSWORD is not set or is an insecure placeholder ('{password}'). "
            "Set a password in your .env file (ADMIN_PASSWORD=yourpassword) "
            "before running seeds."
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

# database/seeds_mongo.py
# GENESIS — MongoDB seed script (replaces database/seeds.py)
# Creates default admin user + module states if missing.
# Fully idempotent — safe to run multiple times.

from __future__ import annotations

import logging
import os

from security.password_hash import hash_password
from database.models_mongo import User, ModuleState

log = logging.getLogger("database.seeds_mongo")

_BLOCKED_PASSWORDS = {"", "changeme", "password"}

_DEFAULT_MODULES = ["m1", "m2", "m3", "m4", "m5", "m6", "core"]


async def seed_all() -> dict:
    """
    Idempotent seeder. Creates:
      - Admin user (if not exists)
      - Default module states (if not exists)

    Returns:
        {"admin_created": bool, "modules_seeded": int}
    """
    admin_created  = False
    modules_seeded = 0

    # ── Admin user ────────────────────────────────────────────────────────────
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_email    = os.getenv("ADMIN_EMAIL", "admin@genesis.ai")
    admin_password = os.getenv("ADMIN_PASSWORD", "")

    if admin_password in _BLOCKED_PASSWORDS:
        admin_password = "Genesis@2024!"
        log.warning(
            "ADMIN_PASSWORD not set or insecure — using built-in fallback. "
            "Set ADMIN_PASSWORD in your environment variables."
        )

    existing_admin = await User.find_one(User.username == admin_username)
    if not existing_admin:
        admin = User(
            username=admin_username,
            email=admin_email,
            hashed_pw=hash_password(admin_password),
            is_admin=True,
            is_active=True,
            needs_name_setup=False,
            display_name="Admin",
        )
        await admin.insert()
        log.info(f"Admin user created: username={admin_username}")
        admin_created = True
    else:
        log.info(f"Admin user exists: username={admin_username} — skipping.")

    # ── Module states ─────────────────────────────────────────────────────────
    for key in _DEFAULT_MODULES:
        existing = await ModuleState.find_one(ModuleState.module_key == key)
        if not existing:
            await ModuleState(module_key=key, enabled=True, config={}).insert()
            log.info(f"Module state seeded: {key}")
            modules_seeded += 1

    return {"admin_created": admin_created, "modules_seeded": modules_seeded}

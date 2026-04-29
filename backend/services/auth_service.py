# services/auth_service.py
from __future__ import annotations
import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger("services.auth")

async def register_user(username: str, password: str, email: Optional[str] = None) -> dict:
    from database.models_mongo import User
    from security.password_hash import hash_password
    existing = await User.find_one(User.username == username)
    if existing:
        raise ValueError(f"Username '{username}' already taken")
    user = User(username=username, email=email, hashed_pw=hash_password(password))
    await user.insert()
    log.info(f"Registered user: {username}")
    return {"id": str(user.id), "username": user.username}

async def authenticate_user(username: str, password: str) -> Optional[object]:
    from database.models_mongo import User
    from security.password_hash import verify_password
    user = await User.find_one(User.username == username)
    if not user or not verify_password(password, user.hashed_pw):
        return None
    user.last_login = datetime.utcnow()
    await user.save()
    return user

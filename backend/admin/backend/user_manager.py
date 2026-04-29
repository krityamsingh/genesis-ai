# admin/backend/user_manager.py — MongoDB/Beanie version
from __future__ import annotations
import logging
from datetime import datetime

from database.models_mongo  import User, LoginSession
from security               import hash_password

log = logging.getLogger(__name__)


async def list_users() -> list[dict]:
    users = await User.find_all().to_list()
    result = []
    for u in users:
        session_count = await LoginSession.find(LoginSession.user_id == str(u.id)).count()
        result.append({
            "id":            str(u.id),
            "username":      u.username,
            "email":         u.email,
            "phone":         u.phone,
            "display_name":  u.display_name,
            "google_id":     u.google_id,
            "is_admin":      u.is_admin,
            "is_active":     u.is_active,
            "last_login":    u.last_login.isoformat() if u.last_login else None,
            "created_at":    u.created_at.isoformat(),
            "session_count": session_count,
        })
    return result


async def create_user(username: str, email: str, password: str, is_admin: bool = False) -> dict:
    if await User.find_one(User.username == username):
        raise ValueError("Username already exists.")
    user = User(
        username=username, email=email,
        hashed_pw=hash_password(password),
        is_admin=is_admin, is_active=True,
    )
    await user.insert()
    log.info(f"User created: {username}")
    return {"id": str(user.id), "username": username}


async def deactivate_user(user_id: str):
    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if user:
        user.is_active = False
        await user.save()


async def promote_to_admin(user_id: str):
    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if user:
        user.is_admin = True
        await user.save()


async def revoke_admin(user_id: str):
    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if user:
        user.is_admin = False
        await user.save()

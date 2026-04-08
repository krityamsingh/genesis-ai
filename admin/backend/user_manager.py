# admin/backend/user_manager.py
from __future__ import annotations
import uuid, time
from database.db     import db_session
from database.models import User
from security        import hash_password


def list_users() -> list[dict]:
    with db_session() as db:
        return [{"id": u.id, "username": u.username, "email": u.email,
                 "is_admin": u.is_admin, "is_active": u.is_active,
                 "created_at": u.created_at}
                for u in db.query(User).all()]


def create_user(username: str, email: str, password: str,
                is_admin: bool = False) -> dict:
    with db_session() as db:
        user = User(
            id        = str(uuid.uuid4()),
            username  = username,
            email     = email,
            hashed_pw = hash_password(password),
            is_admin  = is_admin,
        )
        db.add(user)
    return {"id": user.id, "username": username}


def deactivate_user(user_id: str):
    with db_session() as db:
        u = db.query(User).filter_by(id=user_id).first()
        if u:
            u.is_active = False

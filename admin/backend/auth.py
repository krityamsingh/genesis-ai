# admin/backend/auth.py
from __future__ import annotations
from security import create_token, verify_password
from database.db import db_session
from database.models import User
from shared.exceptions import AuthError
import time


def admin_login(username: str, password: str) -> str:
    """Verify admin credentials, return JWT."""
    with db_session() as db:
        user = db.query(User).filter_by(username=username, is_admin=True).first()
        if not user or not verify_password(password, user.hashed_pw):
            raise AuthError("Invalid admin credentials.")
        user.last_login = time.time()
    return create_token(user.id, is_admin=True)

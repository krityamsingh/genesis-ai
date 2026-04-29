# admin/backend/auth.py — MongoDB/Beanie version
from __future__ import annotations
import logging
import uuid
from datetime import datetime

from database.models_mongo  import User, LoginSession
from security               import create_token, verify_password
from shared.exceptions      import AuthError

log = logging.getLogger(__name__)


async def admin_login(username: str, password: str, ip: str = "", user_agent: str = "") -> str:
    """Verify admin credentials, record login session, return JWT."""
    user = await User.find_one(User.username == username, User.is_admin == True, User.is_active == True)
    if not user or not verify_password(password, user.hashed_pw):
        raise AuthError("Invalid admin credentials.")

    user.last_login = datetime.utcnow()
    await user.save()

    jti = str(uuid.uuid4())
    token = create_token(str(user.id), is_admin=True, jti=jti)

    await LoginSession(
        user_id=str(user.id),
        user_email=user.email,
        user_name=user.display_name or user.username,
        login_method="password",
        ip_address=ip,
        user_agent=user_agent,
        jwt_jti=jti,
    ).insert()

    log.info(f"Admin login: username={username} ip={ip}")
    return token

# api/v1/auth_routes.py
# GENESIS — User Authentication Endpoints (MongoDB/Beanie)
#
# CHANGES (MongoDB Rebuild):
#   • All db_session()/SQLAlchemy queries → Beanie async queries
#   • Login session recorded on every successful login (LoginSession document)
#   • JWT JTI field used for session blacklisting on logout
#   • Logout: blacklists token in MongoDB (replaces Redis)
#   • Admin detection by ADMIN_EMAIL env var at login time
#   • Rate limiting via MongoDB (security/rate_limiter_mongo.py)

from __future__ import annotations

import logging
import os
import time
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from database.models_mongo       import User, LoginSession
from security                    import verify_password, create_token
from security.jwt_handler        import create_refresh_token, verify_refresh_token, decode_token
from security.password_hash      import hash_password, needs_rehash
from security.rate_limiter_mongo import check_rate_limit, RateLimitError, blacklist_token

log = logging.getLogger("api.v1.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_RATE_LIMIT = 10
_ADMIN_EMAIL      = os.getenv("ADMIN_EMAIL", "")


def _make_jti() -> str:
    return str(uuid.uuid4())


@router.post("/login", summary="Log in and receive a Bearer token")
async def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    client_ip  = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")

    try:
        await check_rate_limit(f"login:{client_ip}", limit=_LOGIN_RATE_LIMIT)
    except RateLimitError:
        log.warning(f"Login rate limit hit: ip={client_ip}")
        raise HTTPException(status_code=429, detail="Too many login attempts. Wait 60 seconds.",
                            headers={"Retry-After": "60"})

    try:
        user = await User.find_one(User.username == form.username, User.is_active == True)

        dummy       = "$2b$12$invalidhashpadding000000000000000000000000000000000000"
        stored_hash = user.hashed_pw if user else dummy
        password_ok = verify_password(form.password, stored_hash)

        if not user or not password_ok:
            time.sleep(0.2)
            raise HTTPException(status_code=401, detail="Invalid credentials.")

        if needs_rehash(user.hashed_pw):
            user.hashed_pw = hash_password(form.password)

        if _ADMIN_EMAIL and user.email == _ADMIN_EMAIL:
            user.is_admin = True

        user.last_login = datetime.utcnow()
        await user.save()

        is_admin = bool(user.is_admin)
        user_id  = str(user.id)
        jti      = _make_jti()

        access_token  = create_token(user_id, is_admin=is_admin, jti=jti)
        refresh_token = create_refresh_token(user_id, is_admin=is_admin)

        await LoginSession(
            user_id=user_id,
            user_email=user.email,
            user_name=user.display_name or user.username,
            login_method="password",
            ip_address=client_ip,
            user_agent=user_agent,
            jwt_jti=jti,
        ).insert()

        log.info(f"Login success: user={form.username} admin={is_admin} ip={client_ip}")
        return {
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "token_type":    "bearer",
            "is_admin":      is_admin,
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Login error for user={form.username}: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error.")


class RefreshBody(BaseModel):
    refresh_token: str


@router.post("/refresh", summary="Exchange a refresh token for a new access token")
async def refresh(body: RefreshBody):
    try:
        claims = verify_refresh_token(body.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    new_access = create_token(claims["sub"], is_admin=claims.get("adm", False))
    return {"access_token": new_access, "token_type": "bearer"}


@router.get("/me", summary="Validate token and return current user info")
async def me(authorization: Optional[str] = Header(None)):
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    try:
        claims = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    try:
        from beanie import PydanticObjectId
        user = await User.find_one(User.id == PydanticObjectId(claims["sub"]), User.is_active == True)
        if not user:
            raise HTTPException(status_code=401, detail="User not found or deactivated.")
        return {
            "user_id":      str(user.id),
            "username":     user.username,
            "email":        user.email,
            "display_name": user.display_name,
            "avatar_url":   user.avatar_url,
            "is_admin":     user.is_admin,
            "needs_name_setup": user.needs_name_setup,
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"/me error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch user.")


@router.post("/logout", summary="Log out and blacklist token")
async def logout(authorization: Optional[str] = Header(None)):
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if token:
        try:
            claims = decode_token(token)
            jti    = claims.get("jti", "")
            ttl    = max(0, int(claims.get("exp", 0) - time.time()))
            if jti and ttl > 0:
                await blacklist_token(jti, ttl)
            if jti:
                session = await LoginSession.find_one(LoginSession.jwt_jti == jti)
                if session:
                    session.logged_out_at = datetime.utcnow()
                    session.is_active = False
                    await session.save()
        except Exception:
            pass
    return {"ok": True, "message": "Logged out. Discard your token."}

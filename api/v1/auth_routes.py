# api/v1/auth_routes.py
# GENESIS — User Authentication Endpoints
#
# Fixes applied:
#   • Added per-IP rate limiting on login (10 attempts/minute)
#   • Added constant-time sleep on failure to prevent timing-based user enumeration
#   • Added /refresh endpoint for token renewal without re-entering credentials
#   • Added /me endpoint so the frontend can validate a stored token
#   • Consolidated auth: admin users log in here too (no separate admin auth flow)
#   • logout now optionally accepts token blacklisting via Redis (graceful degradation)
#   • Password rehash on login if stored hash is outdated (bcrypt rounds upgrade)
# =============================================================================

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

from database.db        import db_session
from database.models    import User
from security           import verify_password, create_token
from security.jwt_handler   import create_refresh_token, verify_refresh_token, decode_token
from security.password_hash import hash_password, needs_rehash
from security.rate_limiter  import check_rate_limit, RateLimitError

log = logging.getLogger("api.v1.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_RATE_LIMIT = 10   # attempts per minute per IP


# ── /login ────────────────────────────────────────────────────────────────────

@router.post("/login", summary="Log in and receive a Bearer token")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
):
    """
    OAuth2 password flow.
    Accepts: application/x-www-form-urlencoded  { username, password }
    Returns: { access_token, refresh_token, token_type, is_admin }

    Rate limited to 10 attempts per minute per IP address.
    """
    client_ip = request.client.host if request.client else "unknown"

    # Rate limit per IP
    try:
        check_rate_limit(f"login:{client_ip}", limit=_LOGIN_RATE_LIMIT)
    except RateLimitError:
        log.warning(f"Login rate limit hit: ip={client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please wait 60 seconds.",
            headers={"Retry-After": "60"},
        )

    try:
        with db_session() as db:
            user: User | None = db.query(User).filter_by(
                username=form.username,
                is_active=True,
            ).first()

            # Timing-safe: always verify (even dummy) to prevent timing attacks
            dummy = "$2b$12$invalidhashpadding000000000000000000000000000000000000"
            stored_hash = user.hashed_pw if user else dummy
            password_ok = verify_password(form.password, stored_hash)

            if not user or not password_ok:
                time.sleep(0.2)   # constant-time delay to prevent enumeration
                raise HTTPException(status_code=401, detail="Invalid credentials.")

            # Rehash if stored format is outdated (e.g. old SHA-256 → bcrypt)
            if needs_rehash(user.hashed_pw):
                log.info(f"Rehashing password for user={user.username}")
                user.hashed_pw = hash_password(form.password)

            user.last_login = time.time()
            is_admin        = bool(user.is_admin)
            user_id         = user.id

        access_token  = create_token(user_id, is_admin=is_admin)
        refresh_token = create_refresh_token(user_id, is_admin=is_admin)

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


# ── /refresh ──────────────────────────────────────────────────────────────────

class RefreshBody(BaseModel):
    refresh_token: str


@router.post("/refresh", summary="Exchange a refresh token for a new access token")
async def refresh(body: RefreshBody):
    """
    Use a refresh token (7-day lifetime) to get a new short-lived access token
    without requiring the user to re-enter their password.
    """
    try:
        claims = verify_refresh_token(body.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    new_access = create_token(claims["sub"], is_admin=claims.get("adm", False))
    return {"access_token": new_access, "token_type": "bearer"}


# ── /me ───────────────────────────────────────────────────────────────────────

@router.get("/me", summary="Validate token and return current user info")
async def me(authorization: Optional[str] = Header(None)):
    """
    Returns the current user's ID and admin status from their token.
    Useful for the frontend to validate a stored token on page load.
    Returns 401 if the token is missing or expired.
    """
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    try:
        claims = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    try:
        with db_session() as db:
            user = db.query(User).filter_by(id=claims["sub"], is_active=True).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found or deactivated.")
            return {
                "user_id":  user.id,
                "username": user.username,
                "email":    user.email,
                "is_admin": user.is_admin,
            }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"/me error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch user.")


# ── /logout ───────────────────────────────────────────────────────────────────

@router.post("/logout", summary="Log out (client-side token discard)")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Stateless logout — instructs the client to discard its token.
    Optionally blacklists the token in Redis if REDIS_URL is set,
    preventing replay attacks for the remainder of the token's TTL.
    """
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None

    if token:
        try:
            import os
            redis_url = os.getenv("REDIS_URL", "")
            if redis_url:
                import redis
                from security.jwt_handler import decode_token
                claims = decode_token(token)
                ttl = max(0, int(claims.get("exp", 0) - time.time()))
                if ttl > 0:
                    r = redis.from_url(redis_url, decode_responses=True)
                    r.setex(f"genesis:blacklist:{token[-32:]}", ttl, "1")
                    log.info(f"Token blacklisted for {ttl}s: user={claims.get('sub')}")
        except Exception:
            pass   # Blacklisting is best-effort; never block logout on Redis failure

    return {"ok": True, "message": "Logged out. Discard your token."}

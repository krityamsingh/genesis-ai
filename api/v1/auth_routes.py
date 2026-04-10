# api/v1/auth_routes.py — User authentication endpoints
# The main Login.jsx calls POST /api/v1/auth/login
from __future__ import annotations
import time
import logging

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm

from database.db     import db_session
from database.models import User
from security        import verify_password, create_token

log = logging.getLogger("api.v1.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password flow.
    Accepts: application/x-www-form-urlencoded with username + password fields.
    Returns: { access_token, token_type }
    """
    try:
        with db_session() as db:
            user: User | None = db.query(User).filter_by(
                username=form.username, is_active=True
            ).first()

            if not user or not verify_password(form.password, user.hashed_pw):
                raise HTTPException(status_code=401, detail="Invalid credentials.")

            user.last_login = time.time()
            is_admin = bool(user.is_admin)
            token = create_token(user.id, is_admin=is_admin)

            log.info(f"User '{form.username}' logged in (admin={is_admin})")

        return {"access_token": token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error.")


@router.post("/logout")
async def logout():
    """Client-side logout — just clears localStorage. Server is stateless."""
    return {"ok": True, "message": "Logged out. Discard your token."}

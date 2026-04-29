# security/jwt_handler.py
# GENESIS — JWT Authentication Handler
#
# Uses python-jose (already in requirements.txt) instead of a hand-rolled
# HMAC implementation. Adds:
#   • Hard startup crash if JWT_SECRET is not set in env
#   • Key-rotation support via JWT_SECRET_OLD (optional)
#   • Full claim validation (exp, iat, sub presence)
#   • Token refresh helper
# =============================================================================

from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError, ExpiredSignatureError

log = logging.getLogger("security.jwt")

# ── Load secret — crash at startup if missing, never fall back to a default ──
_SECRET: str = os.getenv("JWT_SECRET", "")
if not _SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\" "
        "and add it to your .env file before starting the server."
    )

# Optional: previous secret for zero-downtime key rotation
# Set JWT_SECRET_OLD=<previous_secret> while rotating, then remove after TTL expires
_SECRET_OLD: Optional[str] = os.getenv("JWT_SECRET_OLD") or None

_ALGORITHM   = "HS256"
_EXPIRE_SECS = int(os.getenv("JWT_EXPIRE_HOURS", "24")) * 3600


# ── Public API ────────────────────────────────────────────────────────────────

def create_token(user_id: str, is_admin: bool = False, jti: Optional[str] = None) -> str:
    """
    Create a signed JWT for the given user.

    Args:
        user_id:  The user's UUID string (stored as 'sub' claim)
        is_admin: Whether to embed admin flag in the token
        jti:      Optional unique token ID for blacklisting
    """
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": str(user_id),
        "adm": is_admin,
        "iat": now,
        "exp": now + timedelta(seconds=_EXPIRE_SECS),
    }
    if jti:
        payload["jti"] = jti

    token = jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)
    log.debug(f"Token created for user={user_id} admin={is_admin}")
    return token


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT. Tries current secret first, then
    the old secret (if JWT_SECRET_OLD is set) to support key rotation.

    Returns:
        Decoded payload dict with at minimum: sub, adm, iat, exp

    Raises:
        ValueError: on invalid signature, expiry, or malformed token
    """
    secrets_to_try = [_SECRET]
    if _SECRET_OLD:
        secrets_to_try.append(_SECRET_OLD)

    last_error: Exception = ValueError("No secrets configured")

    for secret in secrets_to_try:
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=[_ALGORITHM],
                options={"require": ["sub", "exp", "iat"]},
            )
            # Validate sub is non-empty
            if not payload.get("sub"):
                raise ValueError("Token missing subject claim")
            return payload

        except ExpiredSignatureError as e:
            # Expired is definitive — don't try the old key
            raise ValueError("Token has expired. Please log in again.") from e

        except JWTError as e:
            last_error = e
            continue

    raise ValueError(f"Invalid token: {last_error}") from last_error


def get_user_id(token: str) -> str:
    """Extract user ID from a valid token."""
    return decode_token(token)["sub"]


def is_admin_token(token: str) -> bool:
    """Return True if the token carries admin privileges."""
    return bool(decode_token(token).get("adm", False))


def create_refresh_token(user_id: str, is_admin: bool = False) -> str:
    """
    Create a longer-lived refresh token (7 days).
    Store the returned token securely (httpOnly cookie) — never in localStorage.
    """
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub":  str(user_id),
        "adm":  is_admin,
        "iat":  now,
        "exp":  now + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def verify_refresh_token(token: str) -> dict:
    """Decode and validate a refresh token specifically."""
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise ValueError("Token is not a refresh token")
    return payload

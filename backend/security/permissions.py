# security/permissions.py
from __future__ import annotations
from shared.exceptions import ForbiddenError, AuthError
from security.jwt_handler import decode_token


def require_auth(token: str | None) -> dict:
    if not token:
        raise AuthError("Missing auth token.")
    return decode_token(token)


def require_admin(token: str | None) -> dict:
    claims = require_auth(token)
    if not claims.get("adm"):
        raise ForbiddenError("Admin access required.")
    return claims

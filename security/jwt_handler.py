# security/jwt_handler.py
from __future__ import annotations
import os, time, hmac, hashlib, base64, json

_SECRET = os.getenv("JWT_SECRET", "genesis-dev-secret-CHANGE-IN-PROD")
_ALG    = "HS256"
_EXPIRE = int(os.getenv("JWT_EXPIRE_HOURS", "24")) * 3600


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _sign(msg: str) -> str:
    return _b64url(
        hmac.new(_SECRET.encode(), msg.encode(), hashlib.sha256).digest()
    )


def create_token(user_id: str, is_admin: bool = False) -> str:
    header  = _b64url(json.dumps({"alg": _ALG, "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "sub": user_id,
        "adm": is_admin,
        "iat": int(time.time()),
        "exp": int(time.time()) + _EXPIRE,
    }).encode())
    sig = _sign(f"{header}.{payload}")
    return f"{header}.{payload}.{sig}"


def decode_token(token: str) -> dict:
    try:
        header, payload, sig = token.split(".")
        expected = _sign(f"{header}.{payload}")
        if not hmac.compare_digest(expected, sig):
            raise ValueError("Invalid signature")
        data = json.loads(base64.urlsafe_b64decode(payload + "=="))
        if data.get("exp", 0) < time.time():
            raise ValueError("Token expired")
        return data
    except Exception as e:
        raise ValueError(f"JWT error: {e}") from e


def get_user_id(token: str) -> str:
    return decode_token(token)["sub"]

def is_admin_token(token: str) -> bool:
    return bool(decode_token(token).get("adm"))

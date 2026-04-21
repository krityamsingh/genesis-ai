# api/v1/auth_otp_routes.py
# GENESIS — Mobile OTP Authentication (NEW FILE)
#
# Endpoints:
#   POST /auth/otp/send        — generate & SMS a 6-digit code
#   POST /auth/otp/verify      — verify code, issue JWT
#   POST /auth/setup-name      — save display_name after first login
#
# Requires env vars:
#   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
#   (leave blank to use console-print mode for development)

from __future__ import annotations

import logging
import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from database.models_mongo  import User, LoginSession, OtpCode
from security.jwt_handler   import create_token, create_refresh_token, decode_token
from security.password_hash import hash_password, verify_password
from security.rate_limiter_mongo import check_rate_limit, RateLimitError

log = logging.getLogger("api.v1.auth_otp")

router = APIRouter(prefix="/auth", tags=["auth"])

_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
_ADMIN_PHONE = os.getenv("ADMIN_PHONE", "")
_OTP_EXPIRY_MINUTES = 10
_MAX_ATTEMPTS       = 5


# ── Schemas ───────────────────────────────────────────────────────────────────

class OtpSendRequest(BaseModel):
    phone: str          # E.164 format: +919876543210


class OtpVerifyRequest(BaseModel):
    phone: str
    code:  str          # 6-digit plain code


class NameSetupRequest(BaseModel):
    display_name: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Generate a cryptographically random 6-digit OTP."""
    return f"{random.SystemRandom().randint(0, 999999):06d}"


def _send_sms(phone: str, code: str) -> None:
    """Send OTP via Twilio. Falls back to console log in dev mode."""
    sid   = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_ = os.getenv("TWILIO_PHONE_NUMBER", "")

    if sid and token and from_:
        try:
            from twilio.rest import Client
            Client(sid, token).messages.create(
                body=f"Your Genesis AI verification code is: {code}. Valid for {_OTP_EXPIRY_MINUTES} minutes.",
                from_=from_,
                to=phone,
            )
            log.info(f"OTP SMS sent to {phone}")
        except Exception as e:
            log.error(f"Twilio send failed: {e}")
            raise HTTPException(status_code=502, detail="Failed to send SMS. Try again.")
    else:
        # Dev mode — print to console
        log.warning(f"[DEV MODE] OTP for {phone}: {code}  (Twilio not configured)")


# ── POST /auth/otp/send ───────────────────────────────────────────────────────

@router.post("/otp/send", summary="Send a 6-digit OTP to a phone number")
async def otp_send(body: OtpSendRequest, request: Request):
    """
    Rate limited to 5 requests per minute per phone.
    Generates a 6-digit code, bcrypt-hashes it, stores it in otp_codes
    collection with a 10-minute TTL, then sends it via Twilio SMS.
    """
    client_ip = request.client.host if request.client else "unknown"

    phone = body.phone.strip()
    if not phone.startswith("+"):
        raise HTTPException(status_code=422, detail="Phone must be in E.164 format (+countrycode...).")

    try:
        await check_rate_limit(f"otp_send:{phone}", limit=5)
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Wait 60 seconds.")

    code      = _generate_otp()
    code_hash = hash_password(code)
    expires   = datetime.utcnow() + timedelta(minutes=_OTP_EXPIRY_MINUTES)

    # Invalidate any existing unused OTPs for this phone
    old_codes = await OtpCode.find(OtpCode.phone == phone, OtpCode.used == False).to_list()
    for old in old_codes:
        await old.delete()

    await OtpCode(phone=phone, code_hash=code_hash, expires_at=expires).insert()

    _send_sms(phone, code)

    return {"ok": True, "message": f"OTP sent to {phone}. Valid for {_OTP_EXPIRY_MINUTES} minutes."}


# ── POST /auth/otp/verify ─────────────────────────────────────────────────────

@router.post("/otp/verify", summary="Verify OTP code and receive JWT tokens")
async def otp_verify(body: OtpVerifyRequest, request: Request):
    """
    Verifies the 6-digit code against the stored bcrypt hash.
    On success: finds/creates the user, records a LoginSession, issues JWT.
    """
    client_ip  = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    phone      = body.phone.strip()

    try:
        await check_rate_limit(f"otp_verify:{phone}", limit=10)
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Too many attempts. Wait 60 seconds.")

    # Find a valid, unused OTP for this phone
    otp = await OtpCode.find_one(
        OtpCode.phone == phone,
        OtpCode.used  == False,
        OtpCode.expires_at > datetime.utcnow(),
    )

    if not otp:
        raise HTTPException(status_code=400, detail="No valid OTP found. Request a new code.")

    # Increment attempt counter first
    otp.attempts += 1
    await otp.save()

    if otp.attempts > _MAX_ATTEMPTS:
        await otp.delete()
        raise HTTPException(status_code=400, detail="Too many failed attempts. Request a new code.")

    if not verify_password(body.code, otp.code_hash):
        raise HTTPException(status_code=400, detail="Invalid code. Try again.")

    # Mark OTP as used
    otp.used = True
    await otp.save()

    # Find or create user
    user = await User.find_one(User.phone == phone)
    is_new = False

    if not user:
        username = f"user_{phone[-4:]}"
        base, counter = username, 1
        while await User.find_one(User.username == username):
            username = f"{base}_{counter}"
            counter += 1

        user = User(
            username=username,
            phone=phone,
            hashed_pw=hash_password(os.urandom(32).hex()),
            is_active=True,
            is_admin=False,
            needs_name_setup=True,
        )
        await user.insert()
        is_new = True
        log.info(f"Auto-registered OTP user: phone={phone} username={username}")

    # Admin detection by phone
    if _ADMIN_PHONE and phone == _ADMIN_PHONE:
        user.is_admin = True

    user.last_login = datetime.utcnow()
    await user.save()

    uid      = str(user.id)
    is_admin = bool(user.is_admin)
    needs_ns = bool(user.needs_name_setup)
    jti      = str(uuid.uuid4())

    access_token  = create_token(uid, is_admin=is_admin, jti=jti)
    refresh_token = create_refresh_token(uid, is_admin=is_admin)

    await LoginSession(
        user_id=uid,
        user_email=user.email,
        user_name=user.display_name or user.username,
        login_method="otp",
        ip_address=client_ip,
        user_agent=user_agent,
        jwt_jti=jti,
    ).insert()

    log.info(f"OTP verify success: phone={phone} uid={uid} new={is_new}")

    return {
        "access_token":    access_token,
        "refresh_token":   refresh_token,
        "token_type":      "bearer",
        "is_admin":        is_admin,
        "needs_name_setup": needs_ns,
    }


# ── POST /auth/setup-name ──────────────────────────────────────────────────────

@router.post("/setup-name", summary="Set display name after first login")
async def setup_name(
    body: NameSetupRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Called once after a new Google/OTP user's first login.
    Saves display_name and sets needs_name_setup=False.
    """
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    try:
        claims = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    display_name = body.display_name.strip()
    if not display_name or len(display_name) < 1:
        raise HTTPException(status_code=422, detail="Display name cannot be empty.")
    if len(display_name) > 64:
        raise HTTPException(status_code=422, detail="Display name too long (max 64 chars).")

    try:
        from beanie import PydanticObjectId
        user = await User.find_one(User.id == PydanticObjectId(claims["sub"]))
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        user.display_name    = display_name
        user.needs_name_setup = False
        await user.save()

        log.info(f"Display name set: uid={user.id} name={display_name}")
        return {"ok": True, "display_name": display_name}
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"/setup-name error: {e}")
        raise HTTPException(status_code=500, detail="Could not save display name.")

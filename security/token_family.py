# security/token_family.py — Refresh token rotation with theft detection (Phase 7)
# Only active when FEATURE_TOKEN_FAMILY=on
from __future__ import annotations
import hashlib, logging, uuid
from datetime import datetime, timedelta
from typing import Optional

log = logging.getLogger("security.token_family")

def _hash(raw: str) -> str: return hashlib.sha256(raw.encode()).hexdigest()

async def create_pair(user_id: str) -> dict:
    from config.feature_flags import flags
    from security.jwt_handler import decode_token, encode_token
    family_id   = str(uuid.uuid4())
    access_tok  = encode_token({"sub": user_id, "type": "access"})
    refresh_raw = encode_token({"sub": user_id, "type": "refresh", "fid": family_id})
    if flags.token_family_enabled:
        from database.models_mongo import TokenFamily
        await TokenFamily(user_id=user_id, family_id=family_id,
                          refresh_hash=_hash(refresh_raw),
                          expires_at=datetime.utcnow()+timedelta(days=30)).insert()
    return {"access_token": access_tok, "refresh_token": refresh_raw, "token_type": "Bearer"}

async def rotate_pair(refresh_raw: str) -> dict:
    from config.feature_flags import flags
    from security.jwt_handler import decode_token, encode_token
    claims    = decode_token(refresh_raw)
    if claims.get("type") != "refresh": raise ValueError("Not a refresh token")
    user_id   = claims["sub"]; family_id = claims.get("fid", "")
    new_access  = encode_token({"sub": user_id, "type": "access"})
    new_refresh = encode_token({"sub": user_id, "type": "refresh", "fid": family_id})
    if flags.token_family_enabled:
        from database.models_mongo import TokenFamily
        fam = await TokenFamily.find_one(TokenFamily.family_id == family_id)
        if fam:
            if fam.is_revoked: raise ValueError("Token family revoked")
            if fam.refresh_hash != _hash(refresh_raw):
                fam.is_revoked = True; await fam.save()
                raise ValueError("Token reuse detected — family invalidated")
            fam.refresh_hash = _hash(new_refresh); await fam.save()
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "Bearer"}

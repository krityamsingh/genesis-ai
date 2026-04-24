# services/key_service.py — API key management (Phase 6)
from __future__ import annotations
import hashlib, logging, secrets
from datetime import datetime, timedelta
from typing import Optional

log = logging.getLogger("services.key")

def _hash(raw: str) -> str: return hashlib.sha256(raw.encode()).hexdigest()

async def create_key(user_id: str, name: str, scope: str = "full", expire_days: Optional[int] = None) -> dict:
    from database.models_mongo import ApiKey
    raw = secrets.token_urlsafe(32)
    key = ApiKey(user_id=user_id, name=name, key_hash=_hash(raw), key_prefix=raw[:8],
                 scope=scope, expires_at=datetime.utcnow()+timedelta(days=expire_days) if expire_days else None)
    await key.insert(); return {"id": str(key.id), "key": raw, "prefix": raw[:8], "scope": scope}

async def list_keys(user_id: str) -> list:
    from database.models_mongo import ApiKey
    keys = await ApiKey.find(ApiKey.user_id == user_id, ApiKey.is_active == True).to_list()
    return [{"id": str(k.id), "name": k.name, "prefix": k.key_prefix, "scope": k.scope} for k in keys]

async def revoke_key(user_id: str, key_id: str) -> None:
    from database.models_mongo import ApiKey
    key = await ApiKey.get(key_id)
    if key and key.user_id == user_id: key.is_active = False; await key.save()

async def verify_key(raw: str) -> Optional[object]:
    from database.models_mongo import ApiKey
    key = await ApiKey.find_one(ApiKey.key_hash == _hash(raw), ApiKey.is_active == True)
    if not key: return None
    if key.expires_at and key.expires_at < datetime.utcnow(): key.is_active = False; await key.save(); return None
    key.last_used_at = datetime.utcnow(); await key.save(); return key

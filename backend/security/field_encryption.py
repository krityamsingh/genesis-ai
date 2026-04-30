# security/field_encryption.py — AES-256-GCM field encryption (Phase 7)
from __future__ import annotations
import base64, hashlib, hmac, logging, os

log = logging.getLogger("security.field_encryption")

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    _OK = True
except ImportError:
    _OK = False; log.warning("cryptography not installed — field encryption disabled")

def _key() -> bytes:
    raw = os.getenv("FIELD_ENCRYPTION_KEY", "")
    if not raw: log.warning("FIELD_ENCRYPTION_KEY not set — using insecure dev key")
    return (raw.encode()[:32]).ljust(32, b"\x00")

def encrypt(plaintext: str) -> str:
    if not _OK or not plaintext: return plaintext
    try:
        nonce = os.urandom(12); ct = AESGCM(_key()).encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ct).decode()
    except Exception as e: log.error(f"Encrypt failed: {e}"); return plaintext

def decrypt(ciphertext: str) -> str:
    if not _OK or not ciphertext: return ciphertext
    try:
        data = base64.b64decode(ciphertext.encode())
        return AESGCM(_key()).decrypt(data[:12], data[12:], None).decode()
    except Exception: return ciphertext  # likely plaintext

def hmac_index(value: str) -> str:
    return hmac.new(_key(), value.lower().encode(), hashlib.sha256).hexdigest()

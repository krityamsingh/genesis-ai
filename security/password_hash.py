# security/password_hash.py
import hashlib, os, hmac

SALT_BYTES = 32

def hash_password(password: str) -> str:
    salt = os.urandom(SALT_BYTES).hex()
    h    = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{h}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, h = hashed.split(":", 1)
        expected = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
        return hmac.compare_digest(expected, h)
    except Exception:
        return False

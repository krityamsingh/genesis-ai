# security/password_hash.py
# GENESIS — Password Hashing
#
# Fixes applied:
#   • Replaced hand-rolled SHA-256 + hex-salt with passlib bcrypt
#     SHA-256 is NOT suitable for password storage:
#       - No work factor (trivially brute-forced with GPUs)
#       - Custom implementation is bug-prone
#     bcrypt is the industry standard: slow by design, salted automatically,
#     resistant to GPU/ASIC attacks
#   • passlib[bcrypt] is already in requirements.txt
#   • Backward compatibility: old SHA-256 hashes are detected and rejected
#     (force re-login / password reset) rather than silently passing
# =============================================================================

from __future__ import annotations

import logging

from passlib.context import CryptContext

log = logging.getLogger("security.password_hash")

# Bcrypt with cost factor 12 (recommended for 2024+)
# rounds=12 means ~300ms per hash on modern hardware — slow enough to deter
# brute force, fast enough for normal login flows
_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Returns a string in the format: $2b$12$<salt+hash>
    Safe to store directly in the database.
    """
    if not password:
        raise ValueError("Password must not be empty")
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a plaintext password against a stored hash.

    Handles:
        • bcrypt hashes (new format: $2b$...)
        • Old SHA-256 hashes (old format: <hex_salt>:<hex_hash>) — these
          are REJECTED and return False, forcing users to reset their password.
          Do NOT silently accept old hashes — that defeats the security upgrade.

    Returns:
        True if the password matches the bcrypt hash.
        False if the password is wrong OR the hash is in the old format.
    """
    if not password or not hashed:
        return False

    # Detect old SHA-256 format (64-char hex salt : 64-char hex hash)
    if ":" in hashed and not hashed.startswith("$"):
        log.warning(
            "Password stored in old SHA-256 format. "
            "This user must reset their password — returning False."
        )
        return False

    try:
        return _pwd_context.verify(password, hashed)
    except Exception as e:
        log.error(f"Password verification error: {e}")
        return False


def needs_rehash(hashed: str) -> bool:
    """
    Return True if the hash should be upgraded (e.g. bcrypt rounds increased).
    Call this after a successful login and re-hash if True.

    Usage:
        if verify_password(plain, user.hashed_pw):
            if needs_rehash(user.hashed_pw):
                user.hashed_pw = hash_password(plain)
                db.commit()
    """
    if not hashed or ":" in hashed:
        return True
    try:
        return _pwd_context.needs_update(hashed)
    except Exception:
        return True

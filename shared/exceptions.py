# shared/exceptions.py
# GENESIS — Custom exceptions

class GenesisError(Exception):
    """Base exception for all GENESIS errors."""
    status_code: int = 500

class AuthError(GenesisError):
    status_code = 401

class ForbiddenError(GenesisError):
    status_code = 403

class NotFoundError(GenesisError):
    status_code = 404

class ValidationError(GenesisError):
    status_code = 422

class IngestionError(GenesisError):
    """Raised when M1 ingestion fails."""
    status_code = 400

class EngineError(GenesisError):
    """Raised when GemmaEngine call fails."""
    status_code = 503

class RateLimitError(GenesisError):
    status_code = 429

# api/__init__.py
# FIX: Do NOT import create_app or app here.
# Importing this package must never trigger app creation (causes double-init
# and import-time crashes when modules are not yet fully loaded).
# Use: from api.main import app   — directly where needed.

__all__ = []

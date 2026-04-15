# security/cors_config.py
# GENESIS — CORS Configuration
#
# Fixes applied:
#   • allow_methods and allow_headers changed from ["*"] to explicit lists
#     The combination of allow_credentials=True + allow_methods=["*"] +
#     allow_headers=["*"] is both a security risk and causes browser errors
#     when allow_origins is a wildcard
#   • Explicit allowed headers/methods are still permissive but not unlimited
# =============================================================================

from __future__ import annotations

import os

CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    ).split(",")
    if o.strip()
]

CORS_SETTINGS: dict = {
    "allow_origins":     CORS_ORIGINS,
    "allow_credentials": True,
    # Explicit methods instead of ["*"] — covers everything Genesis needs
    "allow_methods":     ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    # Explicit headers instead of ["*"]
    "allow_headers":     [
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Cache-Control",
    ],
    # Max age for preflight cache (24 hours)
    "max_age": 86400,
}

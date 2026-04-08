# security/cors_config.py
import os

CORS_ORIGINS = [
    o.strip() for o in
    os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    if o.strip()
]

CORS_SETTINGS = {
    "allow_origins":     CORS_ORIGINS,
    "allow_credentials": True,
    "allow_methods":     ["*"],
    "allow_headers":     ["*"],
}

#!/bin/bash
set -e
echo "[Setup] Installing GENESIS..."
pip install -r requirements.txt
cp -n .env.example .env || true
python scripts/seed_data.py
echo "[Setup] Done. Run: uvicorn api.main:app --reload"

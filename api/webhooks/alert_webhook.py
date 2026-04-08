# api/webhooks/alert_webhook.py
from __future__ import annotations
from fastapi import APIRouter, Request
from shared.logger import get_logger

log    = get_logger("webhook.alert")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/alert")
async def alert_webhook(request: Request):
    body = await request.json()
    level   = body.get("level", "info").upper()
    message = body.get("message", "")
    log.warning(f"[ALERT:{level}] {message}")
    return {"ok": True, "received": True}

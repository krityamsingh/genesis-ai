# api/webhooks/training_webhook.py
from __future__ import annotations
from fastapi import APIRouter, Request
from shared.logger import get_logger

log    = get_logger("webhook.training")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/training")
async def training_webhook(request: Request):
    body = await request.json()
    log.info(f"Training webhook received: {body}")
    event = body.get("event", "unknown")
    if event == "training_complete":
        log.info(f"Model training complete: {body.get('model_id')}")
    elif event == "training_failed":
        log.error(f"Training failed: {body.get('error')}")
    return {"ok": True, "event": event}

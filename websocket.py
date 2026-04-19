# api/websocket.py
# GENESIS — Streaming WebSocket Endpoint
#
# Fixes applied:
#   • Authentication: token required as query param on connect
#     (?token=<jwt>) — connection rejected with code 4001 if missing/invalid
#   • Per-user rate limiting on the WebSocket connection
#   • think_stream errors are caught and sent as [ERROR] frames
#     instead of crashing the handler and closing the connection
#   • learn result is safely serialized before send_json
#   • Payload size limit (prevents memory bombs)
#   • Structured [DONE] / [ERROR] protocol so clients can reliably detect end
#   • User ID extracted from token and logged for audit trail
# =============================================================================

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from api.dependencies          import get_m1, get_engine
from security.permissions      import require_auth
from security.rate_limiter     import check_rate_limit, RateLimitError

log = logging.getLogger("api.websocket")

# ── Connection manager (Section D: broadcast module_added events) ─────────────

class _ConnectionManager:
    """Tracks all live WebSocket connections for server-push broadcasts."""

    def __init__(self):
        self._connections: dict[str, "WebSocket"] = {}

    def add(self, user_id: str, ws: "WebSocket"):
        self._connections[user_id] = ws

    def remove(self, user_id: str):
        self._connections.pop(user_id, None)

    async def broadcast(self, message: dict):
        dead = []
        for uid, ws in list(self._connections.items()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.remove(uid)


_manager = _ConnectionManager()


async def broadcast_to_all(message: dict):
    """
    Public helper — called by tasks/training_tasks.py on training completion.
    Sends module_added event to all connected clients so sidebar auto-refreshes.
    """
    await _manager.broadcast(message)


# Maximum payload size in bytes (50KB). Reject anything larger.
_MAX_PAYLOAD_BYTES = 50_000


# ── Serialization helper ──────────────────────────────────────────────────────

def _safe_serialize(obj: Any) -> Any:
    """
    Convert any object to a JSON-serializable structure.
    Handles dataclasses, objects with to_dict(), and plain dicts.
    """
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if hasattr(obj, "__dataclass_fields__"):
        import dataclasses
        return dataclasses.asdict(obj)
    if hasattr(obj, "__dict__"):
        return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
    # Last resort — let json handle it or raise a clear error
    json.dumps(obj)   # will raise TypeError if not serializable
    return obj


# ── WebSocket handler ─────────────────────────────────────────────────────────

async def ws_stream_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint at /ws/stream

    Authentication:
        Connect with: ws://host/ws/stream?token=<your_jwt>
        Missing or invalid token → connection closed with code 4001.

    Protocol (client → server):
        { "action": "think", "payload": "your prompt here" }
        { "action": "learn", "payload": "text or url to learn from" }

    Protocol (server → client):
        For "think": streams text chunks, then sends "[DONE]"
        For "learn": sends a JSON object with the learn result
        On error:   sends "[ERROR] <message>"
    """

    # ── 1. Authenticate before accepting the connection ──────────────────────
    token = websocket.query_params.get("token")
    claims: dict | None = None

    try:
        claims = require_auth(token)
    except Exception as e:
        log.warning(f"WebSocket auth failed: {e} (ip={websocket.client.host if websocket.client else 'unknown'})")
        await websocket.close(code=4001, reason="Unauthorized: valid Bearer token required as ?token= query param")
        return

    user_id  = claims.get("sub", "unknown")
    is_admin = claims.get("adm", False)

    # ── 2. Per-user connection rate limit (5 new connections per minute) ─────
    conn_key = f"ws:connect:{user_id}"
    try:
        check_rate_limit(conn_key, limit=5)
    except RateLimitError:
        log.warning(f"WebSocket connection rate limit exceeded for user={user_id}")
        await websocket.close(code=4029, reason="Too many connections. Please wait before reconnecting.")
        return

    # ── 3. Accept connection ──────────────────────────────────────────────────
    await websocket.accept()
    _manager.add(user_id, websocket)
    log.info(f"WebSocket connected: user={user_id} admin={is_admin} ip={websocket.client.host if websocket.client else 'unknown'}")

    engine = get_engine()
    m1     = get_m1()

    # ── 4. Message loop ───────────────────────────────────────────────────────
    try:
        while True:
            # Receive raw bytes to check size before parsing
            raw = await websocket.receive_text()

            if len(raw.encode()) > _MAX_PAYLOAD_BYTES:
                await websocket.send_text(f"[ERROR] Payload too large (max {_MAX_PAYLOAD_BYTES // 1000}KB)")
                continue

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text("[ERROR] Invalid JSON payload")
                continue

            action  = data.get("action", "think")
            payload = str(data.get("payload", "")).strip()

            if not payload:
                await websocket.send_text("[ERROR] Empty payload")
                continue

            # ── Per-user message rate limit (60 messages per minute) ─────────
            msg_key = f"ws:msg:{user_id}"
            try:
                check_rate_limit(msg_key, limit=60)
            except RateLimitError:
                await websocket.send_text("[ERROR] Rate limit exceeded. Slow down.")
                continue

            # ── Handle actions ────────────────────────────────────────────────
            if action == "think":
                log.debug(f"ws:think user={user_id} payload_len={len(payload)}")
                try:
                    for chunk in engine.think_stream(payload):
                        if chunk:
                            await websocket.send_text(chunk)
                    await websocket.send_text("[DONE]")
                except Exception as e:
                    log.error(f"ws:think stream error for user={user_id}: {e}")
                    await websocket.send_text(f"[ERROR] Stream failed: {e}")

            elif action == "learn":
                log.debug(f"ws:learn user={user_id} payload_len={len(payload)}")
                try:
                    result = m1.learn(payload)
                    serialized = _safe_serialize(result)
                    await websocket.send_json(serialized)
                except Exception as e:
                    log.error(f"ws:learn error for user={user_id}: {e}")
                    await websocket.send_json({"error": str(e), "status": "failed"})

            else:
                await websocket.send_json({
                    "error": f"Unknown action '{action}'. Supported: think, learn"
                })

    except WebSocketDisconnect:
        log.info(f"WebSocket disconnected: user={user_id}")
        _manager.remove(user_id)

    except Exception as e:
        log.error(f"WebSocket unexpected error for user={user_id}: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except Exception:
            pass

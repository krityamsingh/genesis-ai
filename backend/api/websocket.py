# api/websocket.py
# GENESIS — WebSocket Handler (Phase 6 upgrade: heartbeat + typing events)
#
# All existing message protocol preserved exactly.
# New events added: typing_start, typing_stop, ping/pong
# =============================================================================

from __future__ import annotations

import asyncio, json, logging, time, uuid
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

log = logging.getLogger("api.websocket")
HEARTBEAT_INTERVAL = 30


class _ConnectionManager:
    def __init__(self):
        self._ws: Dict[str, WebSocket] = {}
        self._meta: Dict[str, dict]    = {}

    async def connect(self, ws: WebSocket, user_id: Optional[str] = None,
                      conv_id: Optional[str] = None) -> str:
        await ws.accept()
        cid = str(uuid.uuid4())[:8]
        self._ws[cid]   = ws
        self._meta[cid] = {"user_id": user_id, "conv_id": conv_id, "at": time.time()}
        log.info(f"WS connect: {cid} user={user_id}")
        return cid

    async def disconnect(self, cid: str) -> None:
        self._ws.pop(cid, None); self._meta.pop(cid, None)
        log.info(f"WS disconnect: {cid}")

    async def send(self, cid: str, data: dict) -> None:
        ws = self._ws.get(cid)
        if ws:
            try: await ws.send_text(json.dumps(data))
            except Exception: await self.disconnect(cid)

    async def broadcast_to_all(self, data: dict) -> None:
        for cid in list(self._ws): await self.send(cid, data)

    async def ping_all(self) -> None:
        for cid, ws in list(self._ws.items()):
            try: await ws.send_text(json.dumps({"event": "ping", "ts": time.time()}))
            except Exception: await self.disconnect(cid)

    @property
    def connection_count(self) -> int: return len(self._ws)


_manager = _ConnectionManager()
_heartbeat_started = False


async def _heartbeat():
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        await _manager.ping_all()


async def ws_stream_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint.
    Auth: ?token=<jwt>  — closes 4001 if invalid.
    """
    global _heartbeat_started
    token  = websocket.query_params.get("token")
    conv_id = websocket.query_params.get("conversation_id")
    user_id = None

    if token:
        try:
            from security.jwt_handler import decode_token
            claims  = decode_token(token)
            user_id = claims.get("sub")
        except Exception:
            await websocket.close(code=4001); return

    cid = await _manager.connect(websocket, user_id=user_id, conv_id=conv_id)

    if not _heartbeat_started:
        asyncio.get_event_loop().create_task(_heartbeat())
        _heartbeat_started = True

    try:
        while True:
            raw = await websocket.receive_text()
            try: msg = json.loads(raw)
            except json.JSONDecodeError:
                await _manager.send(cid, {"error": "Invalid JSON"}); continue

            event = msg.get("event", "message")
            if event == "pong": continue

            if event == "message":
                query = msg.get("query", "")
                if not query: continue

                # typing_start
                await _manager.send(cid, {"event": "typing_start", "source": "assistant"})

                # Generate response
                try:
                    from core.gemma_engine import GemmaEngine
                    import os
                    engine = GemmaEngine(token=os.getenv("HF_TOKEN",""), model=os.getenv("GEMMA_MODEL","default"))

                    # Feature-flag: use new pipeline if active
                    from config.feature_flags import flags
                    if flags.new_pipeline_active and hasattr(websocket, "app"):
                        pass  # would inject router/engine from app.state
                    
                    result_parts = []
                    try:
                        for chunk in engine.think_stream(query):
                            result_parts.append(chunk)
                            await _manager.send(cid, {"event": "chunk", "delta": chunk})
                        response_text = "".join(result_parts)
                    except Exception as e:
                        response_text = f"[ERROR] {e}"
                        await _manager.send(cid, {"event": "chunk", "delta": response_text})

                except Exception as e:
                    response_text = f"[ERROR] {e}"
                    await _manager.send(cid, {"event": "chunk", "delta": response_text})

                await _manager.send(cid, {"event": "typing_stop"})
                await _manager.send(cid, {"event": "done", "full_response": response_text})

            elif event == "learn":
                source = msg.get("source", "")
                try:
                    from core.gemma_engine import GemmaEngine
                    import os
                    engine = GemmaEngine(token=os.getenv("HF_TOKEN",""), model=os.getenv("GEMMA_MODEL","default"))
                    result = engine.learn(source)
                    await _manager.send(cid, {"event": "learn_result",
                                              "result": json.dumps(result) if not isinstance(result, str) else result})
                except Exception as e:
                    await _manager.send(cid, {"event": "learn_result", "result": f"[ERROR] {e}"})

    except WebSocketDisconnect:
        log.info(f"WS client disconnected: {cid}")
    except Exception as e:
        log.error(f"WS error {cid}: {e}")
    finally:
        await _manager.disconnect(cid)


def broadcast_to_all(data: dict):
    """Sync-friendly broadcast helper for module_added events etc."""
    asyncio.create_task(_manager.broadcast_to_all(data))

# api/websocket.py — streaming WebSocket endpoint
from __future__ import annotations
from fastapi import WebSocket, WebSocketDisconnect
from api.dependencies import get_m1, get_engine


async def ws_stream_endpoint(websocket: WebSocket):
    """
    WebSocket at /ws/stream
    Client sends: {"action": "think"|"learn", "payload": "..."}
    Server streams back text chunks.
    """
    await websocket.accept()
    engine = get_engine()
    m1     = get_m1()
    try:
        while True:
            data = await websocket.receive_json()
            action  = data.get("action", "think")
            payload = data.get("payload", "")

            if action == "think":
                for chunk in engine.think_stream(payload):
                    if chunk:
                        await websocket.send_text(chunk)
                await websocket.send_text("[DONE]")

            elif action == "learn":
                result = m1.learn(payload)
                await websocket.send_json(result)

            else:
                await websocket.send_json({"error": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        pass

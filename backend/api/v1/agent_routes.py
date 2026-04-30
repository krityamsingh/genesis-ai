"""API v1 — M8 AgentRunner Routes (streaming SSE)"""
from __future__ import annotations
import asyncio, json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from modules.m8_agent_runner import AgentRunner
from api.dependencies import get_current_user

router = APIRouter(prefix="/agent", tags=["Agent Runner (M8)"])
_runner: Optional[AgentRunner] = None

def get_runner() -> AgentRunner:
    global _runner
    if _runner is None:
        _runner = AgentRunner()
    return _runner


class AgentRequest(BaseModel):
    goal:    str
    context: Optional[str] = None
    stream:  bool = True


@router.post("/run")
async def run_agent(body: AgentRequest, user=Depends(get_current_user)):
    """Start an autonomous agent run. Streams SSE events."""
    runner = get_runner()

    if not body.stream:
        # Collect all events and return as JSON
        events = []
        async for event in runner.run(body.goal, body.context):
            events.append(event)
        return {"events": events, "goal": body.goal}

    async def event_stream():
        async for event in runner.run(body.goal, body.context, streaming=True):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/tools")
async def list_tools(user=Depends(get_current_user)):
    """List all available agent tools."""
    runner = get_runner()
    return {"tools": runner.registry.list_tools()}

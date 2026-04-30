"""M8 AgentMemory — In-session memory for agent state across steps."""
from __future__ import annotations
import uuid
from typing import Any, Dict, List, Optional


class AgentMemory:
    """Simple in-memory store for agent sessions."""

    def __init__(self):
        self._sessions: Dict[str, Dict] = {}

    def new_session(self, goal: str) -> Dict:
        sid = str(uuid.uuid4())
        session = {"id": sid, "goal": goal, "history": []}
        self._sessions[sid] = session
        return session

    def add(self, session: Dict, event_type: str, data: Any):
        session["history"].append({"type": event_type, "data": data})

    def get_session(self, sid: str) -> Optional[Dict]:
        return self._sessions.get(sid)

    def summarize(self, session: Dict) -> str:
        lines = [f"Goal: {session['goal']}"]
        for i, h in enumerate(session["history"], 1):
            if h["type"] == "step":
                lines.append(f"  Step {i}: [{h['data']['tool']}] {str(h['data'].get('output',''))[:120]}")
        return "\n".join(lines)

    def clear(self, sid: str):
        self._sessions.pop(sid, None)

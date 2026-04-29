# api/v1/conversation_routes.py
# GENESIS — Conversation + Message CRUD (NEW FILE)
#
# Endpoints:
#   GET    /conversations                    — list user's conversations
#   POST   /conversations                    — create a new conversation
#   GET    /conversations/{id}               — get a single conversation
#   DELETE /conversations/{id}               — soft-delete (archive)
#   GET    /conversations/{id}/messages      — get all messages
#   POST   /conversations/{id}/messages      — send a message & get AI response

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from pydantic import BaseModel

from database.models_mongo import Conversation, Message
from security.jwt_handler  import decode_token
from api.dependencies import require_auth_dep

log = logging.getLogger("api.v1.conversations")

router = APIRouter(prefix="/conversations", tags=["conversations"])


# ── Auth helper ───────────────────────────────────────────────────────────────

def _get_claims(authorization: Optional[str]) -> dict:
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    try:
        return decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ── Schemas ───────────────────────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    module: str = "core"
    title:  Optional[str] = None


class MessageCreate(BaseModel):
    content: str
    module:  Optional[str] = None


# ── GET /conversations ────────────────────────────────────────────────────────

@router.get("/", summary="List user's conversations (sidebar data)")
async def list_conversations(authorization: Optional[str] = Header(None)):
    claims  = _get_claims(authorization)
    user_id = claims["sub"]

    convs = await Conversation.find(
        Conversation.user_id    == user_id,
        Conversation.is_archived == False,
    ).sort(-Conversation.last_message_at).to_list()

    return [
        {
            "id":              str(c.id),
            "title":           c.title,
            "module":          c.module,
            "created_at":      c.created_at.isoformat(),
            "last_message_at": c.last_message_at.isoformat(),
        }
        for c in convs
    ]


# ── POST /conversations ───────────────────────────────────────────────────────

@router.post("/", summary="Create a new conversation")
async def create_conversation(
    body: ConversationCreate,
    authorization: Optional[str] = Header(None),
):
    claims  = _get_claims(authorization)
    user_id = claims["sub"]

    conv = Conversation(
        user_id=user_id,
        module=body.module,
        title=body.title or "New conversation",
    )
    await conv.insert()

    log.info(f"Conversation created: id={conv.id} user={user_id} module={body.module}")
    return {
        "id":         str(conv.id),
        "title":      conv.title,
        "module":     conv.module,
        "created_at": conv.created_at.isoformat(),
    }


# ── GET /conversations/{id} ───────────────────────────────────────────────────

@router.get("/{conv_id}", summary="Get a single conversation")
async def get_conversation(
    conv_id: str,
    authorization: Optional[str] = Header(None),
):
    claims  = _get_claims(authorization)
    user_id = claims["sub"]

    conv = await Conversation.get(PydanticObjectId(conv_id))
    if not conv or (conv.user_id != user_id and not claims.get("adm")):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return {
        "id":              str(conv.id),
        "title":           conv.title,
        "module":          conv.module,
        "created_at":      conv.created_at.isoformat(),
        "last_message_at": conv.last_message_at.isoformat(),
        "is_archived":     conv.is_archived,
    }


# ── DELETE /conversations/{id} ────────────────────────────────────────────────

@router.delete("/{conv_id}", summary="Soft-delete (archive) a conversation")
async def delete_conversation(
    conv_id: str,
    authorization: Optional[str] = Header(None),
):
    claims  = _get_claims(authorization)
    user_id = claims["sub"]

    conv = await Conversation.get(PydanticObjectId(conv_id))
    if not conv or (conv.user_id != user_id and not claims.get("adm")):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv.is_archived = True
    await conv.save()

    return {"ok": True, "message": "Conversation archived."}


# ── GET /conversations/{id}/messages ──────────────────────────────────────────

@router.get("/{conv_id}/messages", summary="Get all messages in a conversation")
async def get_messages(
    conv_id: str,
    authorization: Optional[str] = Header(None),
):
    claims  = _get_claims(authorization)
    user_id = claims["sub"]

    conv = await Conversation.get(PydanticObjectId(conv_id))
    if not conv or (conv.user_id != user_id and not claims.get("adm")):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = await Message.find(
        Message.conversation_id == conv_id,
    ).sort(Message.created_at).to_list()

    return [
        {
            "id":          str(m.id),
            "role":        m.role,
            "content":     m.content,
            "created_at":  m.created_at.isoformat(),
            "module_used": m.module_used,
            "latency_ms":  m.latency_ms,
        }
        for m in messages
    ]


# ── POST /conversations/{id}/messages ─────────────────────────────────────────

@router.post("/{conv_id}/messages", summary="Send a message and receive an AI response")
async def send_message(
    conv_id: str,
    body: MessageCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Saves user message → routes through Genesis AI engine → saves assistant
    response → returns both. Use WebSocket /ws/stream for streaming responses.
    """
    claims  = _get_claims(authorization)
    user_id = claims["sub"]

    conv = await Conversation.get(PydanticObjectId(conv_id))
    if not conv or (conv.user_id != user_id and not claims.get("adm")):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message content cannot be empty.")

    # Save user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=content,
        module_used=body.module or conv.module,
    )
    await user_msg.insert()

    # Auto-set conversation title from first message
    if conv.title == "New conversation":
        conv.title = content[:60].strip()

    # Route through Genesis AI engine
    import time
    t0 = time.time()
    ai_response = ""
    module_used = body.module or conv.module

    try:
        from api.dependencies import get_router_singleton
        genesis_router = get_router_singleton(request.app)
        result = await genesis_router.route(content)
        ai_response = result.get("response", "") if isinstance(result, dict) else str(result)
        module_used = result.get("module", module_used) if isinstance(result, dict) else module_used
    except Exception as e:
        log.error(f"Genesis AI routing error: {e}")
        ai_response = "I encountered an error processing your request. Please try again."

    latency_ms = int((time.time() - t0) * 1000)

    # Save assistant message
    asst_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=ai_response,
        module_used=module_used,
        latency_ms=latency_ms,
    )
    await asst_msg.insert()

    # Update conversation metadata
    conv.last_message_at = datetime.utcnow()
    await conv.save()

    return {
        "user_message": {
            "id":         str(user_msg.id),
            "role":       "user",
            "content":    content,
            "created_at": user_msg.created_at.isoformat(),
        },
        "assistant_message": {
            "id":          str(asst_msg.id),
            "role":        "assistant",
            "content":     ai_response,
            "module_used": module_used,
            "latency_ms":  latency_ms,
            "created_at":  asst_msg.created_at.isoformat(),
        },
    }


# ── Phase 5 — Share endpoint (additive) ──────────────────────────────────────

import secrets as _secrets

@router.post("/{conversation_id}/share")
async def share_conversation(
    conversation_id: str,
    current_user=Depends(require_auth_dep),
):
    """Generate a read-only share link (7-day validity)."""
    conv = await Conversation.get(conversation_id)
    if not conv or conv.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    token = _secrets.token_urlsafe(24)
    base  = "https://genesis.app"
    return {"share_url": f"{base}/share/{conversation_id}?token={token}", "expires_in_days": 7}

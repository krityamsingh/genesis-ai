# services/conversation_service.py
from __future__ import annotations
import logging
from datetime import datetime
from typing import List, Optional

log = logging.getLogger("services.conversation")

async def create_conversation(user_id: str, title: str = "New conversation", module: str = "core") -> object:
    from database.models_mongo import Conversation
    conv = Conversation(user_id=user_id, title=title, module=module)
    await conv.insert()
    return conv

async def list_conversations(user_id: str, limit: int = 50) -> List[object]:
    from database.models_mongo import Conversation
    return await Conversation.find(
        Conversation.user_id == user_id,
        Conversation.is_archived == False,
    ).sort(-Conversation.last_message_at).limit(limit).to_list()

async def add_message(conversation_id: str, role: str, content: str,
                      module_used: Optional[str] = None, latency_ms: Optional[int] = None) -> object:
    from database.models_mongo import Message, Conversation
    msg = Message(conversation_id=conversation_id, role=role, content=content,
                  module_used=module_used, latency_ms=latency_ms)
    await msg.insert()
    conv = await Conversation.get(conversation_id)
    if conv:
        conv.last_message_at = datetime.utcnow()
        await conv.save()
    return msg

async def get_messages(conversation_id: str, limit: int = 100) -> List[object]:
    from database.models_mongo import Message
    return await Message.find(
        Message.conversation_id == conversation_id
    ).sort(Message.created_at).limit(limit).to_list()

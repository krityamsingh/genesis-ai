# api/schemas.py
# GENESIS — Pydantic request/response schemas
# CHANGES: Added ConversationCreate/Response, MessageCreate/Response,
#          LoginSessionResponse, OtpSendRequest, OtpVerifyRequest, NameSetupRequest
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: Optional[str] = None
    token_type:    str = "bearer"
    is_admin:      bool = False
    needs_name_setup: bool = False

class OtpSendRequest(BaseModel):
    phone: str

class OtpVerifyRequest(BaseModel):
    phone: str
    code:  str

class NameSetupRequest(BaseModel):
    display_name: str


# ── Learn ─────────────────────────────────────────────────
class LearnRequest(BaseModel):
    source:      str = Field(..., description="URL, file path, or raw text")
    source_type: Optional[str] = None

class LearnResponse(BaseModel):
    response:               str
    source:                 str
    knowledge_items_stored: int
    domain:                 Optional[str]
    difficulty:             Optional[str]
    skills_found:           int = 0
    concepts_found:         int = 0
    duration_sec:           float = 0.0
    error:                  Optional[str] = None


# ── Ask / Teach ───────────────────────────────────────────
class QueryRequest(BaseModel):
    query:       str
    level:       Optional[str] = "intermediate"
    n:           Optional[int] = 3
    show_answers: Optional[bool] = False

class TextResponse(BaseModel):
    result: str
    module: str = "m1"


# ── Conversations ─────────────────────────────────────────
class ConversationCreate(BaseModel):
    module: str = "core"
    title:  Optional[str] = None

class ConversationResponse(BaseModel):
    id:              str
    title:           str
    module:          str
    created_at:      str
    last_message_at: str

class MessageCreate(BaseModel):
    content: str
    module:  Optional[str] = None

class MessageResponse(BaseModel):
    id:          str
    role:        str
    content:     str
    created_at:  str
    module_used: Optional[str] = None
    latency_ms:  Optional[int] = None


# ── Login Session ─────────────────────────────────────────
class LoginSessionResponse(BaseModel):
    id:            str
    user_id:       str
    user_name:     Optional[str]
    user_email:    Optional[str]
    login_method:  str
    ip_address:    Optional[str]
    logged_in_at:  str
    logged_out_at: Optional[str]
    is_active:     bool
    duration:      str


# ── Route ─────────────────────────────────────────────────
class RouteRequest(BaseModel):
    query: str

class RouteResponse(BaseModel):
    module:   str
    intent:   str
    response: Any
    query:    str


# ── Stats ─────────────────────────────────────────────────
class StatsResponse(BaseModel):
    engine:  str
    kg:      dict
    memory:  dict
    router:  dict
    m1:      dict


# ── Generic ───────────────────────────────────────────────
class OKResponse(BaseModel):
    ok:      bool = True
    message: str  = ""

class ErrorResponse(BaseModel):
    error:   str
    detail:  Optional[str] = None

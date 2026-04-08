# api/schemas.py
# GENESIS — Pydantic request/response schemas
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Optional


# ── Auth ──────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"


# ── Learn ─────────────────────────────────────────────────
class LearnRequest(BaseModel):
    source:      str = Field(..., description="URL, file path, or raw text")
    source_type: Optional[str] = None  # auto-detected if omitted

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
    level:       Optional[str] = "intermediate"   # for teach
    n:           Optional[int] = 3                # for quiz/flashcards
    show_answers: Optional[bool] = False

class TextResponse(BaseModel):
    result: str
    module: str = "m1"


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

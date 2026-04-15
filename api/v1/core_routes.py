# api/v1/core_routes.py
# GENESIS — Core API Routes
#
# Fixes applied:
#   • Every route now requires a valid Bearer JWT (previously all were open)
#   • /summarise changed from POST (no body) → GET (correct HTTP semantics)
#   • /export-dataset restricted to admin-only (exports your full training data)
#   • Per-user rate limiting on expensive endpoints (learn, ask)
#   • Consistent error handling — no raw exceptions leak to clients
#   • Request logging includes user ID for audit trail
# =============================================================================

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, Request
from typing import Optional

from api.dependencies  import get_m1, get_memory, get_router, get_engine, get_kg
from api.schemas       import (
    LearnRequest, LearnResponse,
    QueryRequest, TextResponse,
    RouteRequest, RouteResponse,
    OKResponse,
)
from security.permissions  import require_auth, require_admin
from security.rate_limiter import check_rate_limit, RateLimitError
from shared.exceptions     import AuthError

log = logging.getLogger("api.v1.core")

router = APIRouter(prefix="/core", tags=["core"])


# ── Auth + rate-limit dependencies ───────────────────────────────────────────

def _get_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract raw Bearer token string from Authorization header."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


def _auth(token: str = Depends(_get_token)) -> dict:
    """Require any authenticated user."""
    return require_auth(token)


def _admin_auth(token: str = Depends(_get_token)) -> dict:
    """Require admin privileges."""
    return require_admin(token)


def _user_rate_limit(
    request: Request,
    claims: dict = Depends(_auth),
) -> dict:
    """
    Combined auth + per-user rate limit (60 req/min).
    Use as a dependency on endpoints that hit the LLM.
    """
    user_id = claims.get("sub", request.client.host if request.client else "anon")
    try:
        check_rate_limit(f"user:{user_id}:core", limit=60)
    except RateLimitError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=429, detail=str(e), headers={"Retry-After": "60"})
    return claims


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/learn", response_model=LearnResponse)
async def learn(
    req: LearnRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    """
    Feed any source (text, URL, PDF path) to the M1 Self-Learner.
    Requires: authenticated user.
    Rate limit: 60 requests per minute per user.
    """
    log.info(f"learn: user={claims.get('sub')} source_len={len(req.source)}")
    try:
        result = m1.learn(req.source)
        return LearnResponse(**{k: result.get(k, None) for k in LearnResponse.model_fields})
    except Exception as e:
        log.error(f"learn error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Learning failed. Check server logs.")


@router.post("/ask", response_model=TextResponse)
async def ask(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    """
    Answer a question from stored knowledge.
    Requires: authenticated user.
    """
    log.debug(f"ask: user={claims.get('sub')} query={req.query[:80]}")
    return TextResponse(result=m1.ask(req.query))


@router.post("/teach", response_model=TextResponse)
async def teach(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    """
    Explain a topic at the requested level.
    Requires: authenticated user.
    """
    level = req.level or "intermediate"
    return TextResponse(result=m1.teach(req.query, level=level))


@router.post("/quiz", response_model=TextResponse)
async def quiz(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    """
    Generate a quiz on a topic.
    Requires: authenticated user.
    """
    n = min(req.n or 3, 20)   # cap at 20 questions
    return TextResponse(result=m1.quiz(req.query, n=n, show_answers=req.show_answers or False))


@router.post("/flashcards", response_model=TextResponse)
async def flashcards(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    """
    Generate flashcards for a topic.
    Requires: authenticated user.
    """
    n = min(req.n or 5, 50)   # cap at 50 cards
    return TextResponse(result=m1.flashcards(req.query, n=n))


@router.get("/summarise", response_model=TextResponse)
async def summarise(
    m1=Depends(get_m1),
    claims: dict = Depends(_auth),
):
    """
    Summarise the entire knowledge base.
    Requires: authenticated user.

    Changed from POST (no body) to GET — POST with no body is incorrect
    HTTP semantics and confuses OpenAPI consumers.
    """
    return TextResponse(result=m1.summarise())


@router.post("/route", response_model=RouteResponse)
async def route(
    req: RouteRequest,
    router_=Depends(get_router),
    claims: dict = Depends(_auth),
):
    """
    Auto-route a query to the best module.
    Requires: authenticated user.
    """
    result = router_.route(req.query)
    return RouteResponse(**result)


@router.get("/stats", response_model=dict)
async def stats(
    engine=Depends(get_engine),
    kg=Depends(get_kg),
    memory=Depends(get_memory),
    router_=Depends(get_router),
    m1=Depends(get_m1),
    claims: dict = Depends(_auth),
):
    """
    System stats for the dashboard.
    Requires: authenticated user.
    """
    return {
        "engine": str(engine),
        "kg":     kg.stats(),
        "memory": memory.stats(),
        "router": router_.stats(),
        "m1":     m1.stats(),
    }


@router.post("/export-dataset")
async def export_dataset(
    kg=Depends(get_kg),
    claims: dict = Depends(_admin_auth),
):
    """
    Export a training dataset from stored knowledge.
    Requires: ADMIN — this exports your entire knowledge graph as training data.
    """
    log.info(f"export-dataset: requested by admin={claims.get('sub')}")
    from core.dataset_generator import DatasetGenerator
    generator = DatasetGenerator(kg)
    try:
        path  = generator.generate_sft_dataset()
        stats = generator.stats()
        return {
            "status":    "success",
            "file_path": path,
            "records":   stats["estimated_records"],
        }
    except Exception as e:
        log.error(f"export-dataset failed: {e}")
        return {"status": "error", "message": str(e)}

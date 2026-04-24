# api/v1/core_routes.py
# GENESIS — Core API Routes
#
# FIX APPLIED:
#   • /learn endpoint built LearnResponse with:
#       LearnResponse(**{k: result.get(k, None) for k in LearnResponse.model_fields})
#     When result is an error dict (missing skills_found/concepts_found/duration_sec),
#     those fields get None — but they are typed as `int` and `float` in the schema,
#     so Pydantic raises ValidationError (500) instead of returning the error.
#     Fix: use the schema defaults as fallback values, not None.
# =============================================================================

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request
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
    user_id = claims.get("sub", request.client.host if request.client else "anon")
    try:
        check_rate_limit(f"user:{user_id}:core", limit=60)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e), headers={"Retry-After": "60"})
    return claims


# ── Helper — build LearnResponse safely ──────────────────────────────────────

def _build_learn_response(result: dict) -> LearnResponse:
    """
    FIX: Previously used `result.get(k, None)` for every field — but
    skills_found, concepts_found (int) and duration_sec (float) have non-None
    defaults in the schema.  Passing None into an `int` field raises a
    Pydantic ValidationError.  Instead, fall back to each field's schema
    default so the response is always valid.
    """
    defaults = {
        "response":               "",
        "source":                 "",
        "knowledge_items_stored": 0,
        "domain":                 None,
        "difficulty":             None,
        "skills_found":           0,     # int — must NOT be None
        "concepts_found":         0,     # int — must NOT be None
        "duration_sec":           0.0,   # float — must NOT be None
        "error":                  None,
    }
    merged = {k: result.get(k, defaults[k]) for k in defaults}
    return LearnResponse(**merged)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/learn", response_model=LearnResponse)
async def learn(
    req: LearnRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    log.info(f"learn: user={claims.get('sub')} source_len={len(req.source)}")
    try:
        result = m1.learn(req.source)
        # FIX: use safe builder instead of {k: result.get(k, None) ...}
        return _build_learn_response(result)
    except Exception as e:
        log.error(f"learn error: {e}")
        raise HTTPException(status_code=500, detail="Learning failed. Check server logs.")


@router.post("/ask", response_model=TextResponse)
async def ask(
    req: QueryRequest,
    request: Request,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    """
    /ask endpoint — feature-flag controlled pipeline switchover (Phase 5).
    FEATURE_NEW_PIPELINE=off    → old behaviour, identical to v2
    FEATURE_NEW_PIPELINE=shadow → run both, log diff, return OLD response
    FEATURE_NEW_PIPELINE=on     → new reasoning pipeline
    """
    from config.feature_flags import flags

    user_id = claims.get("sub")
    log.debug(f"ask: user={user_id} query={req.query[:80]} pipeline={flags.pipeline_mode}")

    # ── OLD path (always available) ──────────────────────────────────────────
    if not flags.new_pipeline_active:
        old_response = m1.ask(req.query)

        # Shadow mode: also run new pipeline, log diff, but serve OLD response
        if flags.shadow_mode:
            import asyncio
            try:
                router_obj = get_router(request)
                engine_obj = get_engine(request)
                from core.reasoning_pipeline import ReasoningPipeline
                pipeline = ReasoningPipeline(router_obj, engine_obj, m1)
                new_result = await pipeline.run(req.query, user_id=user_id)
                new_response = str(new_result.get("response", ""))
                diff = None if old_response == new_response else (
                    f"old_len={len(old_response)} new_len={len(new_response)}")
                # Log trace with diff
                try:
                    from database.models_mongo import ReasoningTrace
                    await ReasoningTrace(
                        request_id=new_result["trace_id"],
                        user_id=user_id,
                        intent=new_result.get("intent",""),
                        module_chosen=new_result.get("module",""),
                        pipeline_mode="shadow",
                        latency_ms=new_result.get("latency_ms",{}),
                        shadow_diff=diff,
                    ).insert()
                except Exception: pass
                if diff:
                    log.info(f"[SHADOW] pipeline diff detected: {diff}")
            except Exception as e:
                log.warning(f"[SHADOW] new pipeline error (non-fatal): {e}")

        return TextResponse(result=old_response)

    # ── NEW pipeline path ────────────────────────────────────────────────────
    try:
        router_obj = get_router(request)
        engine_obj = get_engine(request)
        from core.reasoning_pipeline import ReasoningPipeline
        pipeline = ReasoningPipeline(router_obj, engine_obj, m1)
        result   = await pipeline.run(req.query, user_id=user_id)
        return TextResponse(result=str(result.get("response", "")))
    except Exception as e:
        log.error(f"New pipeline failed, falling back to old: {e}")
        return TextResponse(result=m1.ask(req.query))


@router.post("/teach", response_model=TextResponse)
async def teach(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    level = req.level or "intermediate"
    return TextResponse(result=m1.teach(req.query, level=level))


@router.post("/quiz", response_model=TextResponse)
async def quiz(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    n = min(req.n or 3, 20)
    return TextResponse(result=m1.quiz(req.query, n=n, show_answers=req.show_answers or False))


@router.post("/flashcards", response_model=TextResponse)
async def flashcards(
    req: QueryRequest,
    m1=Depends(get_m1),
    claims: dict = Depends(_user_rate_limit),
):
    n = min(req.n or 5, 50)
    return TextResponse(result=m1.flashcards(req.query, n=n))


@router.get("/summarise", response_model=TextResponse)
async def summarise(
    m1=Depends(get_m1),
    claims: dict = Depends(_auth),
):
    return TextResponse(result=m1.summarise())


@router.post("/route", response_model=RouteResponse)
async def route(
    req: RouteRequest,
    router_=Depends(get_router),
    claims: dict = Depends(_auth),
):
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

# api/v1/core_routes.py
# GENESIS — Core API routes (learn, ask, teach, quiz, stats)
from __future__ import annotations
from fastapi import APIRouter, Depends, Header
from typing import Optional

from api.dependencies  import get_m1, get_memory, get_router, get_engine, get_kg
from api.schemas       import (
    LearnRequest, LearnResponse,
    QueryRequest, TextResponse,
    RouteRequest, RouteResponse,
    StatsResponse, OKResponse,
)
from shared.exceptions import AuthError

router = APIRouter(prefix="/core", tags=["core"])


@router.post("/learn", response_model=LearnResponse)
async def learn(req: LearnRequest, m1=Depends(get_m1)):
    """Feed any source to M1 Self-Learner."""
    result = m1.learn(req.source)
    return LearnResponse(**{k: result.get(k, None) for k in LearnResponse.model_fields})


@router.post("/ask", response_model=TextResponse)
async def ask(req: QueryRequest, m1=Depends(get_m1)):
    """Answer a question from stored knowledge."""
    return TextResponse(result=m1.ask(req.query))


@router.post("/teach", response_model=TextResponse)
async def teach(req: QueryRequest, m1=Depends(get_m1)):
    """Explain a topic at the requested level."""
    level = req.level or "intermediate"
    return TextResponse(result=m1.teach(req.query, level=level))


@router.post("/quiz", response_model=TextResponse)
async def quiz(req: QueryRequest, m1=Depends(get_m1)):
    """Generate a quiz on a topic."""
    n = req.n or 3
    return TextResponse(result=m1.quiz(req.query, n=n, show_answers=req.show_answers or False))


@router.post("/flashcards", response_model=TextResponse)
async def flashcards(req: QueryRequest, m1=Depends(get_m1)):
    """Generate flashcards for a topic."""
    return TextResponse(result=m1.flashcards(req.query, n=req.n or 5))


@router.post("/summarise", response_model=TextResponse)
async def summarise(m1=Depends(get_m1)):
    """Summarise the entire knowledge base."""
    return TextResponse(result=m1.summarise())


@router.post("/route", response_model=RouteResponse)
async def route(req: RouteRequest, router_=Depends(get_router)):
    """Auto-route a query to the best module."""
    result = router_.route(req.query)
    return RouteResponse(**result)


@router.get("/stats", response_model=dict)
async def stats(
    engine=Depends(get_engine),
    kg=Depends(get_kg),
    memory=Depends(get_memory),
    router_=Depends(get_router),
    m1=Depends(get_m1),
):
    return {
        "engine": str(engine),
        "kg":     kg.stats(),
        "memory": memory.stats(),
        "router": router_.stats(),
        "m1":     m1.stats(),
    }

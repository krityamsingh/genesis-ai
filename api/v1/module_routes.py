# api/v1/module_routes.py
# GENESIS — Per-module management routes
from __future__ import annotations
from fastapi import APIRouter, Depends
from api.dependencies  import get_m1
from api.schemas        import QueryRequest, TextResponse, OKResponse

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("/")
async def list_modules():
    return {"modules": ["m1_self_learner", "m2_research_accel",
                        "m3_ai_builder",   "m4_time_reconstruct",
                        "m5_intuition_engine", "m6_reality_sim"],
            "active": ["m1_self_learner"]}


@router.post("/m1/connections", response_model=TextResponse)
async def m1_connections(m1=Depends(get_m1)):
    return TextResponse(result=m1.connections())


@router.post("/m1/gaps", response_model=dict)
async def m1_gaps(req: QueryRequest, m1=Depends(get_m1)):
    gaps = m1.gaps(req.query)
    return {"gaps": [{"topic": g.topic, "description": g.description,
                      "suggested_resources": g.suggested_resources}
                     for g in gaps]}


@router.post("/m1/compare", response_model=TextResponse)
async def m1_compare(topic_a: str, topic_b: str, m1=Depends(get_m1)):
    return TextResponse(result=m1.compare(topic_a, topic_b))


@router.post("/m1/study-plan", response_model=TextResponse)
async def m1_study_plan(req: QueryRequest, duration: str = "2 weeks",
                         m1=Depends(get_m1)):
    return TextResponse(result=m1.study_plan(req.query, duration))


@router.post("/m1/hypotheses", response_model=TextResponse)
async def m1_hypotheses(req: QueryRequest, m1=Depends(get_m1)):
    return TextResponse(result=m1.hypotheses(req.query))

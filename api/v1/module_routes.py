# api/v1/module_routes.py
#
# FIX APPLIED:
#   • Added GET  /modules/{module_id} — frontend calls moduleAPI.info(id)
#   • Added PATCH /modules/{module_id} — frontend calls moduleAPI.toggle(id, state)
#   Both routes returned 404 before this fix.
# =============================================================================

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.dependencies  import get_m1
from api.schemas        import QueryRequest, TextResponse, OKResponse

router = APIRouter(prefix="/modules", tags=["modules"])

# ── Module registry — single source of truth ──────────────────────────────────

_MODULE_REGISTRY = {
    "m1_self_learner":    {"id": "m1_self_learner",    "name": "Self Learner",       "description": "Ingests and learns from any source.", "enabled": True},
    "m2_research_accel":  {"id": "m2_research_accel",  "name": "Research Accelerator","description": "Parses papers and generates hypotheses.", "enabled": False},
    "m3_ai_builder":      {"id": "m3_ai_builder",      "name": "AI Builder",         "description": "Designs and generates ML architectures.", "enabled": False},
    "m4_time_reconstruct":{"id": "m4_time_reconstruct","name": "Time Reconstructor", "description": "Reconstructs timelines and projects futures.", "enabled": False},
    "m5_intuition_engine":{"id": "m5_intuition_engine","name": "Intuition Engine",   "description": "Bayesian reasoning and gap-filling.", "enabled": False},
    "m6_reality_sim":     {"id": "m6_reality_sim",     "name": "Reality Simulator",  "description": "Runs simulations and analyses results.", "enabled": False},
}


class ToggleBody(BaseModel):
    enabled: bool


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
async def list_modules():
    """List all modules with their current enabled state."""
    modules = list(_MODULE_REGISTRY.values())
    return {
        "modules": modules,
        "active":  [m["id"] for m in modules if m["enabled"]],
    }


# FIX: GET /{module_id} — was missing, frontend calls moduleAPI.info(id)
@router.get("/{module_id}")
async def get_module(module_id: str):
    """Return metadata and status for a single module."""
    module = _MODULE_REGISTRY.get(module_id)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found.")
    return module


# FIX: PATCH /{module_id} — was missing, frontend calls moduleAPI.toggle(id, state)
@router.patch("/{module_id}", response_model=OKResponse)
async def toggle_module(module_id: str, body: ToggleBody):
    """Enable or disable a module by ID."""
    module = _MODULE_REGISTRY.get(module_id)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found.")
    _MODULE_REGISTRY[module_id]["enabled"] = body.enabled
    return OKResponse(message=f"Module '{module_id}' {'enabled' if body.enabled else 'disabled'}.")


# ── M1-specific routes ────────────────────────────────────────────────────────

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

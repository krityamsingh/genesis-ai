# api/v1/admin_routes.py
from __future__ import annotations
from fastapi import APIRouter, Header, Depends
from typing import Optional
from security.permissions import require_admin
from api.dependencies     import get_kg, get_m1
from api.schemas          import OKResponse

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin(authorization: Optional[str] = Header(None)):
    require_admin(
        authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    )


@router.get("/kg/stats", dependencies=[Depends(_admin)])
async def kg_stats(kg=Depends(get_kg)):
    return kg.stats()


@router.post("/kg/reset/{collection}", response_model=OKResponse,
             dependencies=[Depends(_admin)])
async def kg_reset(collection: str, kg=Depends(get_kg)):
    kg.reset(collection)
    return OKResponse(message=f"Collection '{collection}' cleared.")


@router.post("/kg/reset-all", response_model=OKResponse,
             dependencies=[Depends(_admin)])
async def kg_reset_all(kg=Depends(get_kg)):
    kg.reset_all()
    return OKResponse(message="All KG collections cleared.")


@router.get("/m1/stats", dependencies=[Depends(_admin)])
async def m1_stats(m1=Depends(get_m1)):
    return m1.stats()

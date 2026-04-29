"""API v1 — M7 Multimodal Routes"""
from __future__ import annotations
import base64
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from typing import Optional

from modules.m7_multimodal import MultimodalProcessor
from api.dependencies import get_current_user

router = APIRouter(prefix="/multimodal", tags=["Multimodal (M7)"])
_processor: Optional[MultimodalProcessor] = None

def get_processor() -> MultimodalProcessor:
    global _processor
    if _processor is None:
        _processor = MultimodalProcessor()
    return _processor


class Base64Request(BaseModel):
    data: str           # base64-encoded content
    media_type: str     # e.g. "image/jpeg"
    filename: Optional[str] = None
    prompt:   Optional[str] = None


@router.post("/analyze")
async def analyze_file(
    file:   UploadFile = File(...),
    prompt: str        = Form(default=""),
    user=Depends(get_current_user),
):
    """Upload a file (image, audio, PDF) and get AI analysis."""
    try:
        data       = await file.read()
        media_type = file.content_type or ""
        processor  = get_processor()
        result     = await processor.process(
            data       = data,
            media_type = media_type,
            filename   = file.filename,
            prompt     = prompt or None,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-b64")
async def analyze_base64(body: Base64Request, user=Depends(get_current_user)):
    """Analyze base64-encoded content (useful for frontend uploads)."""
    try:
        processor = get_processor()
        result    = await processor.process(
            data       = body.data,
            media_type = body.media_type,
            filename   = body.filename,
            prompt     = body.prompt,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supported-types")
async def supported_types(user=Depends(get_current_user)):
    return {
        "images":    ["image/jpeg", "image/png", "image/webp", "image/gif"],
        "audio":     ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"],
        "documents": ["application/pdf", "text/plain", "text/markdown"],
    }

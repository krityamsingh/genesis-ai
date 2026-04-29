"""API v1 — M9 Code Interpreter Routes"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional

from modules.m9_code_interpreter import CodeInterpreter
from api.dependencies import get_current_user

router = APIRouter(prefix="/interpret", tags=["Code Interpreter (M9)"])
_interp: Optional[CodeInterpreter] = None

def get_interpreter() -> CodeInterpreter:
    global _interp
    if _interp is None:
        _interp = CodeInterpreter()
    return _interp


class ExecuteRequest(BaseModel):
    code:      str
    language:  str = "python"
    variables: Dict[str, Any] = {}


@router.post("/execute")
async def execute_code(body: ExecuteRequest, user=Depends(get_current_user)):
    """Execute code and return stdout, stderr, result."""
    interp = get_interpreter()
    try:
        result = await interp.execute(
            code      = body.code,
            language  = body.language,
            variables = body.variables,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/languages")
async def list_languages(user=Depends(get_current_user)):
    """List supported execution languages."""
    interp = get_interpreter()
    return {"languages": interp.supported_languages()}

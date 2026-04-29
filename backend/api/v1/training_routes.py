# ============================================================
# api/v1/training_routes.py
# GENESIS — Training Studio API Routes (Section B)
#
# Endpoints:
#   POST   /training/jobs            — start a new training job
#   GET    /training/jobs            — list all jobs (for current user)
#   GET    /training/jobs/{job_id}   — get job status + progress
#   DELETE /training/jobs/{job_id}   — cancel a pending/training job
#   GET    /training/domains         — list available domains + prompt previews
#   GET    /modules/trained          — list all active trained modules
#   PATCH  /modules/trained/{key}/toggle — enable/disable a trained module
# ============================================================

from __future__ import annotations

import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from api.dependencies import require_auth_dep

log = logging.getLogger("api.training")
router = APIRouter(tags=["training"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class StartTrainingRequest(BaseModel):
    domain: str                        # "trading" | "medical" | "legal" | "code" | "custom"
    name:   str                        # e.g. "My Trading AI v1"
    dataset_url: Optional[str] = None  # HuggingFace dataset ID or URL


class TrainingJobResponse(BaseModel):
    job_id:       str
    domain:       str
    name:         str
    status:       str
    progress_pct: int
    epochs_done:  int
    adapter_path: Optional[str]
    error_msg:    Optional[str]
    started_at:   Optional[str]
    completed_at: Optional[str]


# ── POST /training/jobs ───────────────────────────────────────────────────────

@router.post("/training/jobs", response_model=TrainingJobResponse, status_code=202)
async def start_training_job(
    domain:  str       = Form(...),
    name:    str       = Form(...),
    dataset: UploadFile = File(...),
    current_user = Depends(require_auth_dep),
):
    """
    Upload a .jsonl dataset file and start a domain-specific training job.

    The dataset is validated through LayerManager (dataset_mode) first.
    If validation passes, a Celery fine_tune_with_registration task is dispatched.

    Returns 202 Accepted with job_id immediately — poll /training/jobs/{job_id}
    for progress.
    """
    from pathlib import Path
    import aiofiles

    # Save uploaded file
    upload_dir = Path("uploads/datasets")
    upload_dir.mkdir(parents=True, exist_ok=True)

    from core.training_engine import TrainingJob, TrainingEngine
    import uuid
    job_id = str(uuid.uuid4())
    dataset_path = str(upload_dir / f"{job_id}.jsonl")

    async with aiofiles.open(dataset_path, "wb") as f:
        content = await dataset.read()
        await f.write(content)

    # Validate dataset
    engine = TrainingEngine()
    validation = engine.prepare_dataset(dataset_path, domain=domain)
    if not validation.get("valid"):
        os.unlink(dataset_path)
        failed = validation.get("failures", [])
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Dataset validation failed",
                "total_rows": validation.get("total_rows"),
                "failed_rows": validation.get("failed_rows"),
                "sample_failures": failed[:5],
            },
        )

    # Build job and start training
    job = TrainingJob(
        job_id=job_id,
        domain=domain,
        name=name,
        dataset_path=dataset_path,
        user_id=str(current_user.id),
    )
    job = await engine.start_training(job)

    return TrainingJobResponse(
        job_id=job.job_id,
        domain=job.domain,
        name=job.name,
        status=job.status,
        progress_pct=job.progress_pct,
        epochs_done=job.epochs_done,
        adapter_path=job.adapter_path,
        error_msg=job.error_msg,
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )


# ── GET /training/jobs ────────────────────────────────────────────────────────

@router.get("/training/jobs")
async def list_training_jobs(current_user = Depends(require_auth_dep)):
    """List all training jobs for the current user (admins see all)."""
    from database.training_models_mongo import TrainingJobDoc

    if current_user.is_admin:
        docs = await TrainingJobDoc.find_all().to_list()
    else:
        docs = await TrainingJobDoc.find(
            TrainingJobDoc.user_id == str(current_user.id)
        ).to_list()

    return [
        {
            "job_id":       d.job_id,
            "domain":       d.domain,
            "name":         d.name,
            "status":       d.status,
            "progress_pct": d.progress_pct,
            "epochs_done":  d.epochs_done,
            "adapter_path": d.adapter_path,
            "error_msg":    d.error_msg,
            "started_at":   d.started_at.isoformat() if d.started_at else None,
            "completed_at": d.completed_at.isoformat() if d.completed_at else None,
        }
        for d in docs
    ]


# ── GET /training/jobs/{job_id} ───────────────────────────────────────────────

@router.get("/training/jobs/{job_id}")
async def get_training_job(job_id: str, current_user = Depends(require_auth_dep)):
    """Get status + progress for a specific training job."""
    from database.training_models_mongo import TrainingJobDoc

    doc = await TrainingJobDoc.find_one(TrainingJobDoc.job_id == job_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Training job not found")

    if not current_user.is_admin and doc.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "job_id":       doc.job_id,
        "domain":       doc.domain,
        "name":         doc.name,
        "status":       doc.status,
        "progress_pct": doc.progress_pct,
        "epochs_done":  doc.epochs_done,
        "adapter_path": doc.adapter_path,
        "error_msg":    doc.error_msg,
        "started_at":   doc.started_at.isoformat() if doc.started_at else None,
        "completed_at": doc.completed_at.isoformat() if doc.completed_at else None,
    }


# ── DELETE /training/jobs/{job_id} ────────────────────────────────────────────

@router.delete("/training/jobs/{job_id}", status_code=204)
async def cancel_training_job(job_id: str, current_user = Depends(require_auth_dep)):
    """Cancel a pending or training job. Revokes the Celery task."""
    from database.training_models_mongo import TrainingJobDoc
    from tasks.celery_app import celery_app as app

    doc = await TrainingJobDoc.find_one(TrainingJobDoc.job_id == job_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Training job not found")

    if not current_user.is_admin and doc.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if doc.status in ("done", "failed"):
        raise HTTPException(status_code=409, detail=f"Cannot cancel job with status '{doc.status}'")

    # Revoke Celery task
    app.control.revoke(job_id, terminate=True)
    doc.status = "failed"
    doc.error_msg = "Cancelled by user"
    await doc.save()


# ── GET /training/domains ─────────────────────────────────────────────────────

@router.get("/training/domains")
async def list_domains():
    """
    List available training domains with prompt preview.
    Used by the Training Studio UI domain picker.
    """
    from pathlib import Path
    from layers.layer_config import list_domains

    domains = []
    for domain in list_domains():
        prompt_file = Path(f"prompts/training/{domain}.txt")
        preview = ""
        if prompt_file.exists():
            content = prompt_file.read_text(encoding="utf-8").strip()
            preview = content[:300] + ("..." if len(content) > 300 else "")

        domains.append({
            "domain":        domain,
            "prompt_preview": preview,
            "has_prompt":    prompt_file.exists(),
        })

    return {"domains": domains}


# ── GET /modules/trained ──────────────────────────────────────────────────────

@router.get("/modules/trained")
async def list_trained_modules(current_user = Depends(require_auth_dep)):
    """List all trained modules (active + inactive). Used by sidebar."""
    from database.training_models_mongo import TrainedModule

    docs = await TrainedModule.find_all().to_list()
    return [
        {
            "key":          d.key,
            "domain":       d.domain,
            "name":         d.name,
            "is_active":    d.is_active,
            "base_model":   d.base_model,
            "adapter_path": d.adapter_path,
            "created_at":   d.created_at.isoformat(),
        }
        for d in docs
    ]


# ── PATCH /modules/trained/{key}/toggle ──────────────────────────────────────

@router.patch("/modules/trained/{key}/toggle")
async def toggle_trained_module(key: str, current_user = Depends(require_auth_dep)):
    """Enable or disable a trained module in chat. Admin only."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    from database.training_models_mongo import TrainedModule

    doc = await TrainedModule.find_one(TrainedModule.key == key)
    if not doc:
        raise HTTPException(status_code=404, detail="Trained module not found")

    doc.is_active = not doc.is_active
    await doc.save()

    return {"key": key, "is_active": doc.is_active}

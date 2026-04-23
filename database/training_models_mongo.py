# ============================================================
# database/training_models_mongo.py
# GENESIS — MongoDB Documents for Training System
#
# Two new Beanie documents:
#   TrainingJobDoc — tracks a fine-tuning job lifecycle
#   TrainedModule  — registry of completed trained models
#
# Import these in database/mongo.py's document_models list
# so Beanie initialises them on startup.
# ============================================================

from __future__ import annotations

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pymongo import IndexModel, ASCENDING
from pydantic import Field


def _now() -> datetime:
    return datetime.utcnow()


# ── TrainingJobDoc ────────────────────────────────────────────────────────────

class TrainingJobDoc(Document):
    """
    Tracks a single fine-tuning job from submission to completion.

    Fields:
        job_id        — UUID (same as Celery task ID)
        domain        — "trading" | "medical" | "legal" | "code" | "custom"
        name          — Human-readable model name, e.g. "Trading AI v1"
        dataset_path  — Absolute path to the .jsonl training file
        base_model    — HuggingFace model ID fine-tuned from
        adapter_path  — Set on completion (LoRA adapter directory)
        status        — "pending" | "validating" | "training" | "done" | "failed"
        progress_pct  — 0–100
        epochs_done   — Epochs completed so far
        error_msg     — Populated on failure
        started_at    — When Celery task began
        completed_at  — When training finished
        user_id       — Who triggered this job
    """
    job_id:        str
    domain:        str
    name:          str
    dataset_path:  str
    base_model:    str = "google/gemma-3-4b-it"
    adapter_path:  Optional[str] = None
    status:        str = "pending"          # pending | validating | training | done | failed
    progress_pct:  int = 0
    epochs_done:   int = 0
    error_msg:     Optional[str] = None
    started_at:    Optional[datetime] = None
    completed_at:  Optional[datetime] = None
    user_id:       Optional[str] = None
    created_at:    datetime = Field(default_factory=_now)

    class Settings:
        name = "training_jobs"
        indexes = [
            IndexModel([("job_id",    ASCENDING)], unique=True),
            IndexModel([("user_id",   ASCENDING)], sparse=True),
            IndexModel([("domain",    ASCENDING)]),
            IndexModel([("status",    ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]

    def __repr__(self) -> str:
        return f"<TrainingJobDoc job={self.job_id} domain={self.domain} status={self.status}>"


# ── TrainedModule ─────────────────────────────────────────────────────────────

class TrainedModule(Document):
    """
    Registry entry for a successfully trained LoRA adapter module.
    Persisted when auto_register_model fires on Celery on_success.
    DynamicModuleLoader reads this on startup and on module_added events.

    Fields:
        key              — Unique slug, e.g. "trading_v1", "medical_v2"
        domain           — Domain the model was trained for
        name             — Display name shown in sidebar
        adapter_path     — Absolute path to LoRA adapter weights directory
        base_model       — Base HuggingFace model ID
        is_active        — Admin can toggle off (PATCH /modules/trained/{id}/toggle)
        config           — Freeform JSON stored for the module (temperature, etc.)
        created_by_user_id — Who triggered the training
        created_at       — Registration timestamp
    """
    key:                 str
    domain:              str
    name:                str
    adapter_path:        str
    base_model:          str = "google/gemma-3-4b-it"
    is_active:           bool = True
    config:              dict = Field(default_factory=dict)
    created_by_user_id:  Optional[str] = None
    created_at:          datetime = Field(default_factory=_now)

    class Settings:
        name = "trained_modules"
        indexes = [
            IndexModel([("key",    ASCENDING)], unique=True),
            IndexModel([("domain", ASCENDING)]),
            IndexModel([("is_active", ASCENDING)]),
        ]

    def __repr__(self) -> str:
        return f"<TrainedModule key={self.key} domain={self.domain} active={self.is_active}>"

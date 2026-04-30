# ============================================================
# core/training_engine.py
# GENESIS — Training Engine
#
# Section B: Training Studio backend.
# Orchestrates the full fine-tuning lifecycle:
#   1. prepare_dataset  — validate rows via LayerManager
#   2. start_training   — dispatch Celery fine_tune task
#   3. register_trained_model — write to registry.json + MongoDB
#   4. create_chat_module — instantiate TrainedModelModule live
#
# TrainingJob is the central dataclass tracking every job.
# All DB writes use Beanie (models_mongo.TrainingJob).
#
# Auto-registration fires in Celery on_success callback
# (tasks/training_tasks.py) — zero manual steps needed.
# ============================================================

from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger("core.training_engine")

# Registry file path (relative to project root)
_REGISTRY_PATH = Path(__file__).resolve().parent.parent / "models" / "registry.json"
_FINE_TUNED_DIR = Path(__file__).resolve().parent.parent / "models" / "fine_tuned"

# Domain → system prompt file mapping
_DOMAIN_PROMPT_FILES = {
    "trading": "prompts/training/trading.txt",
    "medical": "prompts/training/medical.txt",
    "legal":   "prompts/training/legal.txt",
    "code":    "prompts/training/code.txt",
    "custom":  "prompts/training/custom.txt",
}

# Domain → recommended base model
_DOMAIN_BASE_MODELS = {
    "trading": "google/gemma-3-4b-it",
    "medical": "google/gemma-3-4b-it",
    "legal":   "google/gemma-3-4b-it",
    "code":    "google/codegemma-7b-it",
    "custom":  "google/gemma-3-4b-it",
}


# ── TrainingJob dataclass ─────────────────────────────────────────────────────

@dataclass
class TrainingJob:
    """
    Tracks a single fine-tuning job from submission to completion.

    Fields:
        job_id:        UUID, unique per job, used as Celery task ID key
        domain:        "trading" | "medical" | "legal" | "code" | "custom"
        dataset_path:  Absolute path to the .jsonl dataset on disk
        name:          Human-readable model name, e.g. "Trading AI v1"
        base_model:    HuggingFace model ID used for fine-tuning
        adapter_path:  Set on completion — path to saved LoRA adapter
        status:        "pending" | "validating" | "training" | "done" | "failed"
        progress_pct:  0–100, updated by training_progress Celery task each epoch
        epochs_done:   How many epochs completed so far
        error_msg:     Populated on failure
        started_at:    When Celery task began
        completed_at:  When fine-tune finished (success or failure)
        user_id:       Who triggered the training
    """
    domain:        str
    dataset_path:  str
    name:          str
    user_id:       Optional[str] = None
    job_id:        str = field(default_factory=lambda: str(uuid.uuid4()))
    base_model:    str = ""
    adapter_path:  Optional[str] = None
    status:        str = "pending"
    progress_pct:  int = 0
    epochs_done:   int = 0
    error_msg:     Optional[str] = None
    started_at:    Optional[datetime] = None
    completed_at:  Optional[datetime] = None

    def __post_init__(self):
        if not self.base_model:
            self.base_model = _DOMAIN_BASE_MODELS.get(self.domain, "google/gemma-3-4b-it")

    def to_dict(self) -> dict[str, Any]:
        return {
            "job_id":        self.job_id,
            "domain":        self.domain,
            "name":          self.name,
            "dataset_path":  self.dataset_path,
            "base_model":    self.base_model,
            "adapter_path":  self.adapter_path,
            "status":        self.status,
            "progress_pct":  self.progress_pct,
            "epochs_done":   self.epochs_done,
            "error_msg":     self.error_msg,
            "started_at":    self.started_at.isoformat() if self.started_at else None,
            "completed_at":  self.completed_at.isoformat() if self.completed_at else None,
            "user_id":       self.user_id,
        }


# ── Training Engine ───────────────────────────────────────────────────────────

class TrainingEngine:
    """
    Orchestrates the end-to-end training pipeline.
    Instantiate once in api/dependencies.py and share via DI.
    """

    def __init__(self):
        _FINE_TUNED_DIR.mkdir(parents=True, exist_ok=True)

    # ── 1. Validate dataset ───────────────────────────────────────────────────

    def prepare_dataset(
        self,
        dataset_path: str,
        domain: str = "general",
        max_rows: int = 500,
    ) -> dict[str, Any]:
        """
        Validate every row of the training dataset through LayerManager
        (dataset_mode) before dispatching the Celery fine-tune task.

        Args:
            dataset_path: Absolute path to .jsonl file (one JSON obj per line)
            domain:       Domain slug for layer config
            max_rows:     Max rows to validate (prevent timeout on huge datasets)

        Returns:
            {
                "valid": bool,
                "total_rows": int,
                "failed_rows": int,
                "failures": [{"row": int, "reason": str}]
            }
        """
        from layers.layer_manager import LayerManager
        lm = LayerManager()

        path = Path(dataset_path)
        if not path.exists():
            return {"valid": False, "error": f"Dataset not found: {dataset_path}"}

        rows_checked = 0
        failed_rows = []

        with open(path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                if i >= max_rows:
                    break

                try:
                    obj = json.loads(line)
                    text = obj.get("text", obj.get("content", str(obj)))
                except json.JSONDecodeError:
                    text = line

                result = lm.validate_dataset_row(text, domain=domain)
                rows_checked += 1

                if not result.passed:
                    failed_rows.append({
                        "row": i + 1,
                        "reason": result.failures[0].description if result.failures else "Unknown",
                    })

        valid = len(failed_rows) == 0
        log.info(
            f"Dataset validation: {rows_checked} rows, {len(failed_rows)} failed "
            f"[domain={domain}]"
        )
        return {
            "valid": valid,
            "total_rows": rows_checked,
            "failed_rows": len(failed_rows),
            "failures": failed_rows,
        }

    # ── 2. Start training ─────────────────────────────────────────────────────

    async def start_training(self, job: TrainingJob) -> TrainingJob:
        """
        Persist job to MongoDB, then dispatch Celery fine_tune task.
        Returns the job (now with status="pending") for the API response.

        The Celery task's on_success callback calls register_trained_model()
        automatically — no manual wiring needed.
        """
        from database.models_mongo import TrainingJobDoc
        from tasks.training_tasks import fine_tune_with_registration

        # Write to DB
        doc = TrainingJobDoc(
            job_id=job.job_id,
            domain=job.domain,
            name=job.name,
            dataset_path=job.dataset_path,
            base_model=job.base_model,
            status="pending",
            user_id=job.user_id,
            started_at=datetime.utcnow(),
        )
        await doc.insert()

        # Output dir for this job
        output_dir = str(_FINE_TUNED_DIR / job.domain / job.job_id)

        # Dispatch Celery task (non-blocking)
        fine_tune_with_registration.apply_async(
            kwargs={
                "job_id":       job.job_id,
                "dataset_path": job.dataset_path,
                "model_id":     job.base_model,
                "output_dir":   output_dir,
                "domain":       job.domain,
                "name":         job.name,
                "user_id":      job.user_id,
            },
            task_id=job.job_id,
        )

        job.status = "pending"
        log.info(f"Training job {job.job_id} dispatched [domain={job.domain}]")
        return job

    # ── 3. Register trained model ─────────────────────────────────────────────

    async def register_trained_model(
        self,
        job_id: str,
        domain: str,
        name: str,
        adapter_path: str,
        base_model: str,
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Called automatically by Celery on_success.
        Writes registry.json + MongoDB TrainedModule document.
        Triggers module_loader to instantiate live without restart.

        Returns:
            {"module_key": str, "domain": str, "adapter_path": str}
        """
        module_key = f"{domain}_v{self._next_version(domain)}"

        # 1. Write registry.json
        self._write_registry(
            module_key=module_key,
            domain=domain,
            name=name,
            adapter_path=adapter_path,
            base_model=base_model,
            user_id=user_id,
        )

        # 2. Write MongoDB TrainedModule
        from database.models_mongo import TrainedModule
        mod = TrainedModule(
            key=module_key,
            domain=domain,
            name=name,
            adapter_path=adapter_path,
            base_model=base_model,
            is_active=True,
            created_by_user_id=user_id,
        )
        await mod.insert()

        # 3. Update TrainingJobDoc status
        from database.models_mongo import TrainingJobDoc
        doc = await TrainingJobDoc.find_one(TrainingJobDoc.job_id == job_id)
        if doc:
            doc.status = "done"
            doc.adapter_path = adapter_path
            doc.completed_at = datetime.utcnow()
            doc.progress_pct = 100
            await doc.save()

        # 4. Trigger live module loader
        self._notify_module_loader(module_key)

        log.info(f"Registered trained model: {module_key} → {adapter_path}")
        return {"module_key": module_key, "domain": domain, "adapter_path": adapter_path}

    # ── 4. Create chat module (live, no restart) ──────────────────────────────

    def create_chat_module(self, module_key: str) -> Any:
        """
        Instantiate a TrainedModelModule from the registry entry.
        Used by DynamicModuleLoader on startup and on module_added events.
        """
        from modules.trained_module import TrainedModelModule

        registry = self._load_registry()
        entry = next(
            (m for m in registry.get("trained_models", []) if m["key"] == module_key),
            None,
        )
        if not entry:
            raise ValueError(f"Module '{module_key}' not in registry")

        return TrainedModelModule(
            module_key=module_key,
            domain=entry["domain"],
            adapter_path=entry["adapter_path"],
            base_model=entry["base_model"],
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _load_registry(self) -> dict:
        if _REGISTRY_PATH.exists():
            with open(_REGISTRY_PATH) as f:
                return json.load(f)
        return {"models": [], "trained_models": []}

    def _write_registry(self, **kwargs):
        registry = self._load_registry()
        if "trained_models" not in registry:
            registry["trained_models"] = []

        # Remove existing entry with same key if re-registering
        registry["trained_models"] = [
            m for m in registry["trained_models"]
            if m.get("key") != kwargs["module_key"]
        ]
        registry["trained_models"].append({
            "key":          kwargs["module_key"],
            "domain":       kwargs["domain"],
            "name":         kwargs["name"],
            "adapter_path": kwargs["adapter_path"],
            "base_model":   kwargs["base_model"],
            "type":         "trained",
            "created_by":   kwargs.get("user_id"),
            "created_at":   datetime.utcnow().isoformat(),
        })
        with open(_REGISTRY_PATH, "w") as f:
            json.dump(registry, f, indent=2)

    def _next_version(self, domain: str) -> int:
        registry = self._load_registry()
        existing = [
            m for m in registry.get("trained_models", [])
            if m.get("domain") == domain
        ]
        return len(existing) + 1

    def _notify_module_loader(self, module_key: str):
        """Signal the DynamicModuleLoader to pick up the new module."""
        try:
            from core.module_loader import DynamicModuleLoader
            DynamicModuleLoader.instance().load_module(module_key)
        except Exception as e:
            log.warning(f"module_loader notification failed (non-fatal): {e}")

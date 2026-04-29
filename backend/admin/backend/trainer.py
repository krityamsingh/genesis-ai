# admin/backend/trainer.py
from __future__ import annotations
from tasks.training_tasks import fine_tune


def start_training(model_id: str, dataset_path: str, config: dict = None) -> dict:
    """Kick off async fine-tuning via Celery."""
    task = fine_tune.delay(model_id, dataset_path, config or {})
    return {"task_id": task.id, "status": "queued",
            "model_id": model_id, "dataset": dataset_path}

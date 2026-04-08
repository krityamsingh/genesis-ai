# tasks/training_tasks.py
from __future__ import annotations
from tasks.celery_app import celery_app
from shared.logger    import get_logger

log = get_logger("tasks.training")


@celery_app.task(name="tasks.fine_tune")
def fine_tune(model_id: str, dataset_path: str, config: dict = None):
    """
    Placeholder for model fine-tuning task.
    Implement with HuggingFace Trainer or similar.
    """
    log.info(f"[Task] fine_tune model={model_id} dataset={dataset_path}")
    # TODO: integrate HuggingFace Trainer
    return {"status": "not_implemented", "model_id": model_id}


@celery_app.task(name="tasks.evaluate_model")
def evaluate_model(model_id: str, eval_dataset: str):
    log.info(f"[Task] evaluate_model model={model_id}")
    return {"status": "not_implemented", "model_id": model_id}

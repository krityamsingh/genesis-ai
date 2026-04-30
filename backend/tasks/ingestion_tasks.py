# tasks/ingestion_tasks.py
from __future__ import annotations
from tasks.celery_app    import celery_app
from api.dependencies    import get_m1_for_task
from shared.logger       import get_logger

log = get_logger("tasks.ingestion")


@celery_app.task(bind=True, name="tasks.ingest_source")
def ingest_source(self, source: str):
    """Async M1 learn() — used for large files / slow URLs."""
    log.info(f"[Task] ingest_source started: {source[:80]}")
    try:
        m1     = get_m1_for_task()
        result = m1.learn(source)
        log.info(f"[Task] ingest_source done: {result.get('knowledge_items_stored')} items")
        return result
    except Exception as exc:
        log.error(f"[Task] ingest_source failed: {exc}")
        raise self.retry(exc=exc, countdown=30, max_retries=3)


@celery_app.task(name="tasks.batch_ingest")
def batch_ingest(sources: list[str]):
    """Ingest multiple sources sequentially."""
    results = []
    for src in sources:
        try:
            result = ingest_source.apply(args=[src]).get()
            results.append({"source": src, "ok": True, "result": result})
        except Exception as e:
            results.append({"source": src, "ok": False, "error": str(e)})
    return results

# tasks/schedules.py — Celery Beat periodic schedules
from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    # Merge & deduplicate knowledge every night at 2am
    "nightly-kg-merge": {
        "task":     "tasks.ingestion_tasks.batch_ingest",
        "schedule": crontab(hour=2, minute=0),
        "args":     ([],),  # no sources = no-op; extend as needed
    },
}

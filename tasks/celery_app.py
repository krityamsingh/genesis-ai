# tasks/celery_app.py
from __future__ import annotations
import os
from celery import Celery

BROKER  = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BACKEND = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "genesis",
    broker=BROKER,
    backend=BACKEND,
    include=[
        "tasks.ingestion_tasks",
        "tasks.training_tasks",
        "tasks.sim_tasks",
    ],
)

celery_app.conf.update(
    task_serializer         = "json",
    result_serializer       = "json",
    accept_content          = ["json"],
    timezone                = "UTC",
    enable_utc              = True,
    task_track_started      = True,
    task_acks_late          = True,
    worker_prefetch_multiplier = 1,
)

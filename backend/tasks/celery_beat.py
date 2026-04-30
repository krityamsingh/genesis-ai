# tasks/celery_beat.py
from tasks.celery_app import celery_app
from tasks.schedules  import CELERYBEAT_SCHEDULE

celery_app.conf.beat_schedule = CELERYBEAT_SCHEDULE

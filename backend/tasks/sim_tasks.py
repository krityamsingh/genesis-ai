# tasks/sim_tasks.py
from __future__ import annotations
from tasks.celery_app import celery_app
from shared.logger    import get_logger

log = get_logger("tasks.sim")


@celery_app.task(name="tasks.run_simulation")
def run_simulation(scenario: dict):
    """M6 Reality Sim — async simulation runner."""
    log.info(f"[Task] run_simulation scenario={scenario.get('name','?')}")
    # TODO: connect to M6 sim_runner
    return {"status": "not_implemented", "scenario": scenario}

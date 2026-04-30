# core/reasoning_pipeline.py
# GENESIS — New Reasoning Pipeline (Phase 4)
# Only invoked when FEATURE_NEW_PIPELINE=on|shadow.
# The OLD pipeline in core_routes.py is NEVER touched.
from __future__ import annotations
import logging, time, uuid
from typing import Optional

log = logging.getLogger("core.reasoning_pipeline")

class ReasoningPipeline:
    def __init__(self, router, engine, m1):
        self.router = router; self.engine = engine; self.m1 = m1

    async def run(self, query: str, user_id: Optional[str] = None) -> dict:
        rid = str(uuid.uuid4()); t0 = time.monotonic(); latency: dict = {}

        # Step 1: intent
        t1 = time.monotonic()
        try:
            intent, module_key, confidence = self.router._detect_intent(query)
        except Exception:
            intent, module_key, confidence = "unknown", self.router.default_module, 0.5
        latency["intent_ms"] = int((time.monotonic()-t1)*1000)

        # Step 2: memory context
        user_context = ""
        from config.feature_flags import flags
        if user_id and flags.memory_enabled:
            t2 = time.monotonic()
            try:
                from services import memory_service
                user_context = await memory_service.get_context(user_id)
            except Exception as e:
                log.warning(f"Memory context failed: {e}")
            latency["memory_ms"] = int((time.monotonic()-t2)*1000)

        # Step 3: model selection
        try:
            from core.model_router import classify_task, select_model
            task  = classify_task(query)
            model = select_model(task)
        except Exception:
            model = "default"

        # Step 4: generation
        t4 = time.monotonic()
        enriched = f"[Context: {user_context}]\n{query}" if user_context else query
        try:
            response = self.router._dispatch(module_key, enriched, context=None)
        except Exception as e:
            response = f"Error: {e}"
        latency["gen_ms"] = int((time.monotonic()-t4)*1000)

        # Step 5: memory update
        if user_id and flags.memory_enabled:
            try:
                from services import memory_service
                await memory_service.update_from_interaction(user_id, query, str(response))
            except Exception as e:
                log.warning(f"Memory update failed: {e}")

        latency["total_ms"] = int((time.monotonic()-t0)*1000)

        # Persist trace
        try:
            from database.models_mongo import ReasoningTrace
            await ReasoningTrace(
                request_id=rid, user_id=user_id, intent=intent,
                module_chosen=module_key, pipeline_mode="new", latency_ms=latency,
            ).insert()
        except Exception: pass

        return {"response": response, "module": module_key, "intent": intent,
                "confidence": confidence, "trace_id": rid, "latency_ms": latency, "model": model}

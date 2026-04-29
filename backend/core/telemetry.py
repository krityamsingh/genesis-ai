# core/telemetry.py — OpenTelemetry tracing (Phase 8)
# Only active when FEATURE_TRACING=on
from __future__ import annotations
import logging, os
from typing import Optional

log = logging.getLogger("core.telemetry")
_tracer = None

def setup_telemetry(service_name: str = "genesis-api") -> None:
    from config.feature_flags import flags
    if not flags.tracing_enabled: return
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.resources import Resource
        provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
        ep = os.getenv("OTLP_ENDPOINT")
        if ep:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=ep)))
        trace.set_tracer_provider(provider)
        global _tracer; _tracer = trace.get_tracer(service_name)
        log.info(f"OTel tracing active → {ep or 'no exporter'}")
    except ImportError: log.info("opentelemetry not installed — tracing disabled")
    except Exception as e: log.warning(f"OTel setup failed: {e}")

def start_span(name: str):
    from contextlib import nullcontext
    if _tracer is None: return nullcontext()
    return _tracer.start_as_current_span(name)

def current_trace_id() -> Optional[str]:
    if _tracer is None: return None
    try:
        from opentelemetry import trace
        ctx = trace.get_current_span().get_span_context()
        if ctx and ctx.is_valid: return format(ctx.trace_id, "032x")
    except Exception: pass
    return None

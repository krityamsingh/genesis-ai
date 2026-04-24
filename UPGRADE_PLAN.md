# GENESIS Controlled Incremental Upgrade Plan
# ============================================
# Strategy: freeze → isolate → build parallel → feature-flag switchover → stabilise
#
# LEGEND:  ✅ done  🔄 in-progress  ⬜ pending  🔒 blocked-by-previous

## PHASE 0 — Freeze & Instrumentation  [✅]
- [✅] P0.1  Write VERSIONS.md (canonical file registry)
- [✅] P0.2  Write UPGRADE_PLAN.md (this file)
- [✅] P0.3  Add config/feature_flags.py (feature flag system)
- [✅] P0.4  Add shared/change_log.py (runtime change tracker)
- [✅] P0.5  Add monitoring middleware (request ID, latency) to api/middleware.py

## PHASE 1 — Duplicate Removal (isolated, validated after each step)  [✅]
- [✅] P1.1  Remove root main.py, index.py (were importing from wrong deps)
- [✅] P1.2  Remove root routes.py, schemas.py, cache.py (identical to api/)
- [✅] P1.3  Remove root middleware.py, error_handlers.py (identical to api/)
- [✅] P1.4  Remove root websocket.py (diverged — api/websocket.py is canonical)
- [✅] P1.5  Remove root dependencies.py (had dual require_auth_dep bug)
- [✅] P1.6  Fix api/dependencies.py — remove duplicate sync require_auth_dep
- [✅] P1.7  Validation checkpoint: import graph, no broken references

## PHASE 2 — Unified Config (non-breaking, additive)  [✅]
- [✅] P2.1  Create config/settings.py (Pydantic Settings, reads same env vars)
- [✅] P2.2  Keep all os.getenv() callers working (settings wraps them)
- [✅] P2.3  Validation: settings loads with zero env vars set

## PHASE 3 — Services Layer (parallel build, no traffic yet)  [✅]
- [✅] P3.1  Create services/ directory structure
- [✅] P3.2  Build services/auth_service.py (mirrors auth_routes logic)
- [✅] P3.3  Build services/conversation_service.py
- [✅] P3.4  Build services/core_service.py
- [✅] P3.5  Validation: services importable, unit tested in isolation

## PHASE 4 — Intelligence Components (parallel, no traffic)  [✅]
- [✅] P4.1  Build core/reasoning_pipeline.py (new, no old code touched)
- [✅] P4.2  Build core/context_manager.py
- [✅] P4.3  Build services/memory_service.py + UserMemory document
- [✅] P4.4  Build core/plugins/registry.py + built-in plugins
- [✅] P4.5  Build core/model_router.py
- [✅] P4.6  Validation: all components unit tested in isolation

## PHASE 5 — Feature-Flag Traffic Switchover  [✅]
- [✅] P5.1  Add FEATURE_NEW_PIPELINE flag (default: off)
- [✅] P5.2  Wrap /core/ask to use new pipeline when flag=on
- [✅] P5.3  Add reasoning trace logging (visible in admin)
- [✅] P5.4  Shadow mode: run both old+new, compare, log diffs (flag=shadow)
- [✅] P5.5  Validation: flag=off → identical behaviour to v2

## PHASE 6 — Scalability (after pipeline stable)  [✅]
- [✅] P6.1  Build core/cache/ two-tier system (additive)
- [✅] P6.2  Wire cache into new pipeline only (feature-flagged)
- [✅] P6.3  WebSocket overhaul (heartbeat, reconnection, typing events)
- [✅] P6.4  API key management + usage tracking

## PHASE 7 — Security Baseline (enforced from start)  [✅]
- [✅] P7.1  JWT token family rotation
- [✅] P7.2  Field-level encryption helpers
- [✅] P7.3  CORS → explicit allowlist (no wildcards in production)
- [✅] P7.4  Content moderation pipeline (feature-flagged)
- [✅] P7.5  Security test suite + CI workflow

## PHASE 8 — Observability  [✅]
- [✅] P8.1  Prometheus metrics wiring (/metrics endpoint)
- [✅] P8.2  OpenTelemetry distributed tracing
- [✅] P8.3  Grafana dashboard + alerting rules
- [✅] P8.4  Automated backup manager

## INVARIANTS (must hold at every commit)
1. `uvicorn api.main:app` starts without error
2. `GET /health` returns 200
3. `POST /api/v1/auth/login` works
4. `POST /api/v1/core/ask` works (old path always available)
5. No test in tests/unit/ or tests/integration/ goes from PASS to FAIL

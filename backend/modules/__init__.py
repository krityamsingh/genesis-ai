# ============================================================
# modules/__init__.py — GENESIS Module Registry
#
# FIX: All module imports are wrapped in try/except so that a broken
# optional module (M2–M6) never crashes the whole app at startup.
# M1 is the only required module; the rest degrade gracefully.
# ============================================================
from __future__ import annotations
import logging

log = logging.getLogger("modules")

from modules.base_module import BaseModule

# ── M1  (required) ──────────────────────────────────────────
from modules.m1_self_learner import M1, SelfLearner

# ── M2–M6  (optional — failures are logged, not fatal) ──────
M2 = M3 = M4 = M5 = M6 = None

try:
    from modules.m2_research_accel import M2
except Exception as e:
    log.warning(f"[modules] M2 unavailable: {e}")

try:
    from modules.m3_ai_builder import M3
except Exception as e:
    log.warning(f"[modules] M3 unavailable: {e}")

try:
    from modules.m4_time_reconstruct import M4
except Exception as e:
    log.warning(f"[modules] M4 unavailable: {e}")

try:
    from modules.m5_intuition_engine import M5
except Exception as e:
    log.warning(f"[modules] M5 unavailable: {e}")

try:
    from modules.m6_reality_sim import M6
except Exception as e:
    log.warning(f"[modules] M6 unavailable: {e}")


__all__ = [
    "BaseModule",
    "M1", "SelfLearner",
    "M2", "M3", "M4", "M5", "M6",
    "create_m1", "create_m2", "create_m3",
    "create_m4", "create_m5", "create_m6",
    "create_all_modules",
]


def create_m1(engine, kg) -> M1:
    return M1(engine, kg)

def create_m2(engine, kg):
    if M2 is None:
        raise RuntimeError("M2 module failed to load at startup")
    return M2(engine, kg)

def create_m3(engine, kg):
    if M3 is None:
        raise RuntimeError("M3 module failed to load at startup")
    return M3(engine, kg)

def create_m4(engine, kg):
    if M4 is None:
        raise RuntimeError("M4 module failed to load at startup")
    return M4(engine, kg)

def create_m5(engine, kg):
    if M5 is None:
        raise RuntimeError("M5 module failed to load at startup")
    return M5(engine, kg)

def create_m6(engine, kg):
    if M6 is None:
        raise RuntimeError("M6 module failed to load at startup")
    return M6(engine, kg)


def create_all_modules(engine, kg) -> dict:
    """
    Instantiate all available modules wired to the same engine + kg.
    Skips modules that failed to import.
    """
    result = {"m1": M1(engine, kg)}
    for key, cls in [("m2", M2), ("m3", M3), ("m4", M4), ("m5", M5), ("m6", M6)]:
        if cls is not None:
            try:
                result[key] = cls(engine, kg)
            except Exception as e:
                log.warning(f"[modules] Failed to instantiate {key}: {e}")
    return result

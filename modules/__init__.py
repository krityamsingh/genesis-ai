# ============================================================
# modules/__init__.py — GENESIS Module Registry
# ============================================================
from modules.base_module          import BaseModule
from modules.m1_self_learner      import M1, SelfLearner
from modules.m2_research_accel    import M2
from modules.m3_ai_builder        import M3
from modules.m4_time_reconstruct  import M4
from modules.m5_intuition_engine  import M5
from modules.m6_reality_sim       import M6

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

def create_m2(engine, kg) -> M2:
    return M2(engine, kg)

def create_m3(engine, kg) -> M3:
    return M3(engine, kg)

def create_m4(engine, kg) -> M4:
    return M4(engine, kg)

def create_m5(engine, kg) -> M5:
    return M5(engine, kg)

def create_m6(engine, kg) -> M6:
    return M6(engine, kg)


def create_all_modules(engine, kg) -> dict:
    """
    Instantiate all 6 modules wired to the same engine + kg.
    Returns dict keyed by router key.

    Usage:
        modules = create_all_modules(engine, kg)
        router.register("m1", modules["m1"].run)
    """
    return {
        "m1": M1(engine, kg),
        "m2": M2(engine, kg),
        "m3": M3(engine, kg),
        "m4": M4(engine, kg),
        "m5": M5(engine, kg),
        "m6": M6(engine, kg),
    }

# ============================================================
# core/__init__.py
# GENESIS Core — Public API
#
# Usage:
#   from core import GemmaEngine
#   engine = GemmaEngine(token=HF_TOKEN)
#   engine = GemmaEngine(token=HF_TOKEN, model="fast")
# ============================================================

from core.gemma_engine import GemmaEngine, GEMMA4_MODELS

__all__ = ["GemmaEngine", "GEMMA4_MODELS"]

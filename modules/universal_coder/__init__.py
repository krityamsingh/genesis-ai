# ============================================================
# modules/universal_coder/__init__.py
# GENESIS — Universal Coder Module
#
# The central intelligence for all code generation.
# Every coding request from any module routes through here.
#
# Flow:
#   pre_gen_pipeline (P0.1–P0.5)
#       → code generation (best AI for task)
#       → 12-layer filter pipeline
#       → Layer 12 self-heal if failures
#       → return verified code
# ============================================================

from modules.universal_coder.universal_coder import UniversalCoder

__all__ = ["UniversalCoder"]

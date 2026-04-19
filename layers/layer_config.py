# ============================================================
# layers/layer_config.py
# GENESIS — Per-domain and per-mode layer configuration
#
# Maps (mode, domain) → layers to skip and hard stops.
# Called by LayerManager to apply the right subset of checks
# without modifying individual layer files.
#
# Skip list rationale:
#   dataset_mode   — skip L4/L5 (control flow/runtime sim) because
#                    training rows are prose, not executable code.
#                    Keep L8 (compliance) to catch harmful content.
#   inference_mode — skip L1/L2/L3 (code-specific checks) because
#                    user queries are natural language.
#                    Keep L7 (security) + L11 (alignment).
#   prompt_mode    — only L11 (alignment) matters for templates.
#
# Domain overrides:
#   trading  — skip L8 (GDPR compliance — financial data differs)
#   medical  — force L8 strict (patient data), add L7 as hard stop
#   code     — all 12 layers, L1 and L7 are hard stops
# ============================================================

from __future__ import annotations

from typing import Optional

# ── Base skip lists per mode ──────────────────────────────────────────────────

_MODE_SKIP: dict[str, list[int]] = {
    "code_mode":      [],              # all layers active
    "dataset_mode":   [4, 5, 6],       # skip control-flow/runtime/async (prose data)
    "inference_mode": [1, 2, 3, 4, 5, 6, 9, 10],  # keep L7, L8, L11, L12
    "prompt_mode":    [1, 2, 3, 4, 5, 6, 7, 9, 10, 12],  # only L8 + L11
}

# ── Domain-level overrides (add to skip list) ─────────────────────────────────

_DOMAIN_EXTRA_SKIP: dict[str, list[int]] = {
    "trading":  [8],       # skip GDPR compliance check for financial domain
    "medical":  [],        # no extra skips — medical uses all active layers
    "legal":    [],
    "code":     [],        # all 12 layers, identical to code_mode
    "custom":   [],
    "general":  [],
}

# ── Hard stops per mode ───────────────────────────────────────────────────────
# These layers cause immediate pipeline abort on failure (regardless of default).

_MODE_HARD_STOPS: dict[str, list[int]] = {
    "code_mode":      [1, 7],
    "dataset_mode":   [7, 8],          # block harmful training data
    "inference_mode": [7, 11],         # block injection + misaligned queries
    "prompt_mode":    [11],            # block misaligned prompt templates
}

# ── Domain hard stop additions ────────────────────────────────────────────────

_DOMAIN_EXTRA_HARD_STOPS: dict[str, list[int]] = {
    "trading":  [],
    "medical":  [7, 8],    # double-enforce security + compliance for medical
    "legal":    [8],
    "code":     [1, 7],
    "custom":   [],
    "general":  [],
}


# ── Public helpers ────────────────────────────────────────────────────────────

def get_skip_list(mode: str, domain: Optional[str] = None) -> list[int]:
    """Return combined skip list for (mode, domain)."""
    base = list(_MODE_SKIP.get(mode, []))
    if domain:
        extra = _DOMAIN_EXTRA_SKIP.get(domain, [])
        combined = list(set(base + extra))
        return combined
    return base


def get_hard_stops(mode: str, domain: Optional[str] = None) -> list[int]:
    """Return combined hard-stop layer IDs for (mode, domain)."""
    base = list(_MODE_HARD_STOPS.get(mode, []))
    if domain:
        extra = _DOMAIN_EXTRA_HARD_STOPS.get(domain, [])
        combined = list(set(base + extra))
        return combined
    return base


def list_domains() -> list[str]:
    return list(_DOMAIN_EXTRA_SKIP.keys())

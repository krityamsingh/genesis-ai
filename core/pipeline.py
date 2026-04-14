# ============================================================
# core/pipeline.py
# GENESIS — 12-Layer Filter Pipeline Runner
#
# Runs all 12 filter layers in sequence on a piece of code.
# Hard stops on Layer 1 (syntax) and Layer 7 (security).
# Collects all failures and returns a PipelineResult.
#
# Usage:
#   from core.pipeline import run_pipeline
#   result = run_pipeline(code="print('hello')", task="print hello")
# ============================================================

from __future__ import annotations

from core.models import PipelineResult, LayerFailure
from core.caller import get_layer_provider

from layers.l01_syntax       import run as l01
from layers.l02_type_scope   import run as l02
from layers.l03_dependencies import run as l03
from layers.l04_control_flow import run as l04
from layers.l05_runtime_sim  import run as l05
from layers.l06_async_safety import run as l06
from layers.l07_security     import run as l07
from layers.l08_compliance   import run as l08
from layers.l09_performance  import run as l09
from layers.l10_quality      import run as l10
from layers.l11_alignment    import run as l11


# Layer registry — id, run function, hard_stop flag
_LAYERS = [
    (1,  l01, True),
    (2,  l02, False),
    (3,  l03, False),
    (4,  l04, False),
    (5,  l05, False),
    (6,  l06, False),
    (7,  l07, True),
    (8,  l08, False),
    (9,  l09, False),
    (10, l10, False),
    (11, l11, False),
]


def run_pipeline(
    code:             str,
    task:             str,
    skip_layers:      list[int] | None = None,
    stop_on_first:    bool             = False,
) -> PipelineResult:
    """
    Run code through all 12 filter layers.

    Args:
        code:          The code to validate
        task:          Original task description (used by L11 alignment)
        skip_layers:   Optional list of layer IDs to skip (e.g. [8, 9])
        stop_on_first: If True, stop at first failure (not just hard stops)

    Returns:
        PipelineResult with success flag, all failures, and metadata
    """
    skip_layers = skip_layers or []
    all_failures: list[LayerFailure] = []
    layers_run = 0

    for layer_id, run_fn, is_hard_stop in _LAYERS:

        if layer_id in skip_layers:
            continue

        provider = get_layer_provider(layer_id)

        try:
            failures = run_fn(code=code, task=task, provider=provider)
        except Exception as e:
            failures = [LayerFailure(
                layer_id=layer_id,
                layer_name=f"layer_{layer_id}",
                error_type="layer_execution_error",
                description=f"Layer {layer_id} crashed: {e}",
                severity="high",
            )]

        layers_run += 1
        all_failures.extend(failures)

        if failures and (is_hard_stop or stop_on_first):
            return PipelineResult(
                success=False,
                code=code,
                failures=all_failures,
                stopped_at=layer_id,
                layers_run=layers_run,
            )

    return PipelineResult(
        success=len(all_failures) == 0,
        code=code,
        failures=all_failures,
        stopped_at=None,
        layers_run=layers_run,
    )


def run_fast_pipeline(code: str, task: str) -> PipelineResult:
    """
    Fast pipeline — only runs free local layers (1, 2, 10).
    Use for quick checks before spending API credits.
    """
    return run_pipeline(
        code=code,
        task=task,
        skip_layers=[3, 4, 5, 6, 7, 8, 9, 11],
        stop_on_first=True,
    )


def run_security_only(code: str, task: str) -> PipelineResult:
    """
    Security-only pipeline — runs only L6, L7, L8.
    Use when you only need a security check.
    """
    return run_pipeline(
        code=code,
        task=task,
        skip_layers=[1, 2, 3, 4, 5, 9, 10, 11],
    )

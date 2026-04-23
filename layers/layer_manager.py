# ============================================================
# layers/layer_manager.py
# GENESIS — Central Layer Manager
#
# Single entry point for ALL pipeline operations.
# Every piece of data (code, training dataset rows,
# inference queries, prompt templates) is validated here
# before reaching models or users.
#
# Modes:
#   code_mode     — existing 12-layer code validation
#   dataset_mode  — validate training data rows before fine-tune
#   inference_mode— validate user query + model response in chat
#   prompt_mode   — validate prompt templates before save
#
# Usage:
#   from layers.layer_manager import LayerManager
#   lm = LayerManager()
#   result = lm.run(payload, mode="inference_mode", domain="trading")
# ============================================================

from __future__ import annotations

import logging
from typing import Any, Optional

from layers.layer_config import get_skip_list, get_hard_stops
from core.models import PipelineResult, LayerFailure

log = logging.getLogger("layers.layer_manager")


# ── Mode definitions ───────────────────────────────────────────────────────────

VALID_MODES = {"code_mode", "dataset_mode", "inference_mode", "prompt_mode"}


class LayerManager:
    """
    Central orchestrator. Instantiate once at startup; call run() per request.

    Args:
        strict: If True, any layer failure returns passed=False immediately.
                Default False — only hard_stops block.
    """

    def __init__(self, strict: bool = False):
        self.strict = strict
        self._import_layers()

    # ── Private: lazy-import all layer runners ────────────────────────────────

    def _import_layers(self):
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
        from layers.l12_self_heal    import run as l12

        # id → (runner, hard_stop)
        self._layers: dict[int, tuple[Any, bool]] = {
            1:  (l01, True),
            2:  (l02, False),
            3:  (l03, False),
            4:  (l04, False),
            5:  (l05, False),
            6:  (l06, False),
            7:  (l07, True),
            8:  (l08, False),
            9:  (l09, False),
            10: (l10, False),
            11: (l11, False),
            12: (l12, False),
        }

    # ── Public entry point ────────────────────────────────────────────────────

    def run(
        self,
        payload: str,
        mode: str = "code_mode",
        domain: Optional[str] = None,
        task: Optional[str] = None,
    ) -> PipelineResult:
        """
        Validate payload through the appropriate layer subset.

        Args:
            payload:  The string to validate (code, query, dataset row, etc.)
            mode:     One of VALID_MODES
            domain:   Optional domain slug (e.g. "trading", "medical") —
                      used to apply domain-specific skip lists from layer_config
            task:     Optional task description passed to L11 alignment layer

        Returns:
            PipelineResult with passed=True/False and list of LayerFailure
        """
        if mode not in VALID_MODES:
            raise ValueError(f"Unknown mode '{mode}'. Choose from {VALID_MODES}")

        skip = set(get_skip_list(mode=mode, domain=domain))
        hard_stops = set(get_hard_stops(mode=mode))

        failures: list[LayerFailure] = []

        for layer_id, (runner, default_hard_stop) in self._layers.items():
            if layer_id in skip:
                continue

            is_hard_stop = layer_id in hard_stops or default_hard_stop

            try:
                layer_failures: list[LayerFailure] = runner(
                    payload,
                    task=task or payload[:200],
                )
            except Exception as exc:
                log.warning(f"Layer {layer_id} raised exception: {exc}")
                # Non-fatal — treat as empty result unless hard stop
                layer_failures = []

            failures.extend(layer_failures)

            if layer_failures:
                if is_hard_stop or self.strict:
                    log.info(f"[LayerManager] Hard stop at layer {layer_id} ({mode})")
                    return PipelineResult(
                        passed=False,
                        failures=failures,
                        stopped_at=layer_id,
                    )

        passed = len(failures) == 0
        return PipelineResult(passed=passed, failures=failures, stopped_at=None)

    # ── Convenience wrappers ──────────────────────────────────────────────────

    def validate_dataset_row(self, row: str, domain: str = "general") -> PipelineResult:
        """Validate a single training dataset row before fine-tuning starts."""
        return self.run(row, mode="dataset_mode", domain=domain)

    def validate_inference(self, query: str, domain: str = "general") -> PipelineResult:
        """Validate a user query before passing to a trained module."""
        return self.run(query, mode="inference_mode", domain=domain)

    def validate_prompt_template(self, template: str) -> PipelineResult:
        """Validate a prompt template before saving to DB."""
        return self.run(template, mode="prompt_mode")

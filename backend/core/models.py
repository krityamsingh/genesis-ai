# ============================================================
# core/models.py
# GENESIS — Core Data Models
#
# Shared dataclasses used across the entire 12-layer
# filter pipeline. Every layer returns list[LayerFailure].
# The pipeline returns PipelineResult.
# The pre-gen phase returns PreGenResult.
# ============================================================

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ════════════════════════════════════════════════════════════
# Layer failure — one issue found by one layer
# ════════════════════════════════════════════════════════════

@dataclass
class LayerFailure:
    """
    Represents a single problem found by a filter layer.

    Attributes:
        layer_id:    Which layer found this (1–12)
        layer_name:  Human-readable layer name
        error_type:  Short category e.g. "syntax_error", "sql_injection"
        description: Full explanation of the problem
        line_numbers: Which lines are affected (empty if unknown)
        bad_snippet:  The exact broken code section (used by heal prompt)
        fix_hint:     Optional hint for the repair AI
        severity:     "critical" | "high" | "medium" | "low"
    """
    layer_id:    int
    layer_name:  str
    error_type:  str
    description: str
    line_numbers: list[int]    = field(default_factory=list)
    bad_snippet:  str          = ""
    fix_hint:     str          = ""
    severity:     str          = "high"

    def to_dict(self) -> dict:
        return {
            "layer_id":    self.layer_id,
            "layer_name":  self.layer_name,
            "error_type":  self.error_type,
            "description": self.description,
            "line_numbers": self.line_numbers,
            "bad_snippet":  self.bad_snippet,
            "fix_hint":     self.fix_hint,
            "severity":     self.severity,
        }

    def format(self) -> str:
        lines = f"lines {self.line_numbers}" if self.line_numbers else "unknown lines"
        return (
            f"[L{self.layer_id} {self.layer_name}] {self.error_type} "
            f"at {lines}: {self.description}"
        )

    def __repr__(self) -> str:
        return f"<LayerFailure L{self.layer_id} {self.error_type}>"


# ════════════════════════════════════════════════════════════
# Pipeline result — what the 12-layer pipeline returns
# ════════════════════════════════════════════════════════════

@dataclass
class PipelineResult:
    """
    Result of running code through the 12-layer filter pipeline.

    Attributes:
        success:   True if all layers passed with no failures
        code:      The code that was evaluated
        failures:  All LayerFailure instances found across all layers
        stopped_at: Layer number where a hard stop occurred (1 or 7), or None
        layers_run: How many layers actually executed
    """
    success:    bool
    code:       str
    failures:   list[LayerFailure] = field(default_factory=list)
    stopped_at: Optional[int]      = None
    layers_run: int                = 0

    @property
    def has_critical(self) -> bool:
        return any(f.severity == "critical" for f in self.failures)

    @property
    def failure_count(self) -> int:
        return len(self.failures)

    @property
    def failed_layers(self) -> list[int]:
        return list({f.layer_id for f in self.failures})

    def failures_for_layer(self, layer_id: int) -> list[LayerFailure]:
        return [f for f in self.failures if f.layer_id == layer_id]

    def to_dict(self) -> dict:
        return {
            "success":    self.success,
            "failures":   [f.to_dict() for f in self.failures],
            "stopped_at": self.stopped_at,
            "layers_run": self.layers_run,
            "failed_layers": self.failed_layers,
        }

    def summary(self) -> str:
        if self.success:
            return f"All {self.layers_run} layers passed."
        parts = [f"L{f.layer_id}:{f.error_type}" for f in self.failures[:5]]
        extra = f" +{len(self.failures)-5} more" if len(self.failures) > 5 else ""
        return f"{len(self.failures)} failure(s): {', '.join(parts)}{extra}"

    def __repr__(self) -> str:
        status = "PASS" if self.success else f"FAIL({len(self.failures)})"
        return f"<PipelineResult {status} layers_run={self.layers_run}>"


# ════════════════════════════════════════════════════════════
# Pre-gen result — what the pre-generation pipeline returns
# ════════════════════════════════════════════════════════════

@dataclass
class PreGenResult:
    """
    Result of the pre-generation phase (P0.1 – P0.5).

    Attributes:
        ready_to_generate:   True = code generation can begin
        needs_clarification: True = questions sent back to user
        questions:           List of questions for the user
        research_brief:      Summary of public research (Mode A) or KG results
        architecture_plan:   Full design plan from GPT-4o
        specialist_model:    Model key if a trained specialist was found
        task_type:           Classified task type from P0.1
        complexity_score:    0–100, determines which layers activate
        use_research:        Whether Mode A (public research) is on
    """
    ready_to_generate:   bool          = False
    needs_clarification: bool          = False
    questions:           list[str]     = field(default_factory=list)
    research_brief:      str           = ""
    architecture_plan:   str           = ""
    specialist_model:    Optional[str] = None
    task_type:           str           = "general"
    complexity_score:    int           = 50
    use_research:        bool          = False

    def to_dict(self) -> dict:
        return {
            "ready_to_generate":   self.ready_to_generate,
            "needs_clarification": self.needs_clarification,
            "questions":           self.questions,
            "research_brief":      self.research_brief[:500] if self.research_brief else "",
            "architecture_plan":   self.architecture_plan[:500] if self.architecture_plan else "",
            "specialist_model":    self.specialist_model,
            "task_type":           self.task_type,
            "complexity_score":    self.complexity_score,
        }

    def __repr__(self) -> str:
        if self.needs_clarification:
            return f"<PreGenResult NEEDS_CLARIFICATION q={len(self.questions)}>"
        if self.ready_to_generate:
            spec = f" specialist={self.specialist_model}" if self.specialist_model else ""
            return f"<PreGenResult READY task={self.task_type}{spec}>"
        return "<PreGenResult PENDING>"


# ════════════════════════════════════════════════════════════
# Heal result — what the self-heal loop returns
# ════════════════════════════════════════════════════════════

@dataclass
class HealResult:
    """
    Result of the Layer 12 self-heal loop.

    Attributes:
        success:      True if code passed all layers after healing
        final_code:   The last version of the code (fixed or not)
        attempts:     How many heal attempts were made (max 3)
        repair_log:   Per-attempt record of what was tried
        escalated:    True if all 3 attempts failed
    """
    success:    bool
    final_code: str
    attempts:   int              = 0
    repair_log: list[dict]       = field(default_factory=list)
    escalated:  bool             = False

    def __repr__(self) -> str:
        status = "HEALED" if self.success else ("ESCALATED" if self.escalated else "FAILED")
        return f"<HealResult {status} attempts={self.attempts}>"

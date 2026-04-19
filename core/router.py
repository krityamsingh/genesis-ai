# ============================================================
# core/router.py
# GENESIS — Module Router
#
# Routes incoming requests to the correct GENESIS module
# based on intent detection.  Supports:
#   - Keyword-based fast routing (no LLM call needed)
#   - LLM-based fallback routing (uses GemmaEngine)
#
# Usage:
#   router = Router(engine, modules={"m1": m1_instance, ...})
#   result = router.route("Learn this article: https://...")
#   result = router.route("Quiz me on Python decorators")
# ============================================================

from __future__ import annotations

import re
from typing import TYPE_CHECKING, Any, Callable, Optional

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine


# ============================================================
# Intent → Module mapping rules (keyword-based, fast path)
# ============================================================

_INTENT_RULES: list[tuple[list[str], str]] = [
    # M1 — Self-Learner
    (["learn", "study", "teach me", "explain", "quiz", "flashcard",
      "summarise", "summarize", "what is", "what are", "how does",
      "read this", "ingest", "from url", "from pdf", "from text",
      "compare", "gaps", "connections"], "m1"),

    # M2 — Research Accelerator (future)
    (["research", "paper", "arxiv", "literature", "hypothesis",
      "findings", "experiment", "citation"], "m2"),

    # M3 — AI Builder (future)
    (["build", "create app", "generate code", "architect", "design system",
      "deploy", "scaffold", "code for"], "m3"),

    # M4 — Time Reconstruct (future)
    (["timeline", "history of", "reconstruct", "future of",
      "predict", "project", "when did", "era", "period"], "m4"),

    # M5 — Intuition Engine (future)
    (["intuit", "gut feeling", "bayesian", "probability",
      "cross-domain", "insight", "gap fill"], "m5"),

    # M6 — Reality Sim (future)
    (["simulate", "simulation", "run scenario", "model world",
      "what if", "real world test"], "m6"),
]


# ============================================================
# Router
# ============================================================


# ── Domain intent keywords (for trained modules) ──────────────────────────────
# When a trained module is registered, its domain keywords are prepended to
# _INTENT_RULES so the router auto-routes relevant queries to it.
_DOMAIN_INTENT_KEYWORDS: dict[str, list[str]] = {
    "trading":  ["trade", "stock", "market", "forex", "crypto", "invest",
                 "portfolio", "candlestick", "technical analysis", "bull", "bear"],
    "medical":  ["diagnosis", "symptom", "patient", "clinical", "drug",
                 "medication", "disease", "treatment", "medical"],
    "legal":    ["contract", "law", "legal", "clause", "jurisdiction",
                 "liability", "statute", "court", "case"],
    "code":     ["debug", "function", "class", "algorithm", "refactor",
                 "optimize", "unit test", "code review"],
    "custom":   [],
}

class Router:
    """
    GENESIS module router.

    Detects user intent and dispatches to the right module.
    Registered modules must be callable:
        module(query: str) -> Any

    OR pass objects with a default method (e.g. m1.ask).

    Args:
        engine:          GemmaEngine for LLM-based fallback routing
        modules:         dict of {"m1": callable, "m2": callable, ...}
        default_module:  module key to use when intent is ambiguous
    """

    def __init__(
        self,
        engine: "GemmaEngine",
        modules: Optional[dict[str, Any]] = None,
        default_module: str = "m1",
    ):
        self.engine         = engine
        self.modules        = modules or {}
        self.default_module = default_module
        self._route_log:    list[dict] = []

        print(f"[Router] Ready  modules={list(self.modules.keys())}")

    # ── register ──────────────────────────────────────────

    def register(self, name: str, module: Any):
        """Register a module under a key."""
        self.modules[name] = module
        print(f"[Router] Registered module: {name}")

    def register_module(self, key: str, module: Any):
        """
        Register a trained module dynamically (Section C).
        Adds domain keywords to _INTENT_RULES — no restart needed.
        Called by DynamicModuleLoader on startup and on module_added events.
        """
        self.modules[key] = module
        domain = getattr(module, "domain", None)
        if domain and domain in _DOMAIN_INTENT_KEYWORDS:
            kws = _DOMAIN_INTENT_KEYWORDS[domain]
            if kws:
                _INTENT_RULES.insert(0, (kws, key))
        print(f"[Router] Live-registered trained module: {key} (domain={domain})")

    # ── route ─────────────────────────────────────────────

    def route(self, query: str, use_llm_fallback: bool = True) -> dict:
        """
        Detect intent and dispatch query to the correct module.

        Returns:
            {
              "module":   str,      # which module handled it
              "intent":   str,      # detected intent label
              "response": Any,      # module output
              "query":    str,
            }
        """
        intent, module_key = self._detect_intent(query)

        # LLM fallback if no keyword matched and engine available
        if module_key == "unknown" and use_llm_fallback:
            module_key = self._llm_route(query)
            intent = f"llm:{module_key}"

        # Final fallback to default module
        if module_key not in self.modules:
            module_key = self.default_module
            intent = f"default:{module_key}"

        response = self._dispatch(module_key, query)

        log_entry = {
            "query":   query[:100],
            "intent":  intent,
            "module":  module_key,
        }
        self._route_log.append(log_entry)

        return {
            "module":   module_key,
            "intent":   intent,
            "response": response,
            "query":    query,
        }

    # ── detect intent ─────────────────────────────────────

    def _detect_intent(self, query: str) -> tuple[str, str]:
        """Keyword-based intent detection. Returns (intent_label, module_key)."""
        q = query.lower()
        for keywords, module_key in _INTENT_RULES:
            for kw in keywords:
                if kw in q:
                    return (kw, module_key)
        return ("unknown", "unknown")

    def _llm_route(self, query: str) -> str:
        """Ask GemmaEngine to classify intent when keywords fail."""
        available = list(self.modules.keys()) or ["m1"]
        prompt = (
            f"Available modules: {available}\n"
            f"User query: {query}\n\n"
            f"Which module key (one of {available}) best handles this? "
            "Reply with ONLY the module key, nothing else."
        )
        try:
            raw = self.engine.think(prompt, temperature=0.0, max_tokens=10)
            key = raw.strip().lower().strip('"').strip("'")
            if key in self.modules:
                return key
        except Exception:
            pass
        return self.default_module

    def _dispatch(self, module_key: str, query: str) -> Any:
        """Call the module with the query."""
        module = self.modules.get(module_key)
        if module is None:
            return f"[Router] No module registered for '{module_key}'."
        try:
            # If module is callable directly
            if callable(module):
                return module(query)
            # If module has a default ask/run method
            for method_name in ("ask", "run", "process", "__call__"):
                method = getattr(module, method_name, None)
                if callable(method):
                    return method(query)
            return f"[Router] Module '{module_key}' has no callable interface."
        except Exception as e:
            return f"[Router] Dispatch error for '{module_key}': {e}"

    # ── utility ───────────────────────────────────────────

    def route_log(self) -> list[dict]:
        return list(self._route_log)

    def clear_log(self):
        self._route_log.clear()

    def stats(self) -> dict:
        from collections import Counter
        module_counts = Counter(e["module"] for e in self._route_log)
        return {
            "registered_modules": list(self.modules.keys()),
            "default_module":     self.default_module,
            "total_routed":       len(self._route_log),
            "by_module":          dict(module_counts),
        }

    def __repr__(self) -> str:
        return (
            f"<Router modules={list(self.modules.keys())} "
            f"routed={len(self._route_log)}>"
        )

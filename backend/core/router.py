# core/router.py
# GENESIS — Module Router
#
# UPGRADED 2026-04:
#   • All print() replaced with proper logging
#   • route() now accepts optional context dict for richer dispatch
#   • async_route() added for use in FastAPI / async handlers
#   • Confidence score added to route result
#   • _detect_intent() now scores all rules and picks the highest match
#   • Dead-code cleanup; __slots__ removed for easier subclassing
# =============================================================================

from __future__ import annotations

import logging
from collections import Counter
from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine

log = logging.getLogger("core.router")


# ════════════════════════════════════════════════════════════════════════════
# Intent rules  (keyword → module key)
# ════════════════════════════════════════════════════════════════════════════

_INTENT_RULES: list[tuple[list[str], str]] = [
    # M1 — Self-Learner
    (["learn", "study", "teach me", "explain", "quiz", "flashcard",
      "summarise", "summarize", "what is", "what are", "how does",
      "read this", "ingest", "from url", "from pdf", "from text",
      "compare", "gaps", "connections"], "m1"),

    # M2 — Research Accelerator
    (["research", "paper", "arxiv", "literature", "hypothesis",
      "findings", "experiment", "citation", "peer review"], "m2"),

    # M3 — AI Builder
    (["build", "create app", "generate code", "architect", "design system",
      "deploy", "scaffold", "code for", "write a function", "write a class"], "m3"),

    # M4 — Time Reconstruct
    (["timeline", "history of", "reconstruct", "future of",
      "predict", "project", "when did", "era", "period", "chronicle"], "m4"),

    # M5 — Intuition Engine
    (["intuit", "gut feeling", "bayesian", "probability",
      "cross-domain", "insight", "gap fill", "connect the dots"], "m5"),

    # M6 — Reality Sim
    (["simulate", "simulation", "run scenario", "model world",
      "what if", "real world test", "monte carlo", "stress test"], "m6"),
]

# Domain keywords for dynamically-registered trained modules
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


# ════════════════════════════════════════════════════════════════════════════
# Router
# ════════════════════════════════════════════════════════════════════════════

class Router:
    """
    GENESIS module router.

    Detects user intent and dispatches to the right module.
    Registered modules must be callable:
        module(query: str) -> Any
    OR expose a default method (ask / run / process).

    Args:
        engine:         GemmaEngine for LLM-based fallback routing
        modules:        dict of {"m1": callable, "m2": callable, ...}
        default_module: module key to use when intent is ambiguous
    """

    def __init__(
        self,
        engine:         "GemmaEngine",
        modules:        Optional[dict[str, Any]] = None,
        default_module: str = "m1",
    ):
        self.engine         = engine
        self.modules        = modules or {}
        self.default_module = default_module
        self._route_log:    list[dict] = []

        log.info(f"Router ready — modules={list(self.modules.keys())}")

    # ── Registration ──────────────────────────────────────────────────────────

    def register(self, name: str, module: Any) -> None:
        """Register a module under a key."""
        self.modules[name] = module
        log.info(f"Router: registered module '{name}'")

    def register_module(self, key: str, module: Any) -> None:
        """
        Register a trained module dynamically (Section C).
        Prepends domain keywords to _INTENT_RULES — no restart required.
        """
        self.modules[key] = module
        domain = getattr(module, "domain", None)
        if domain and domain in _DOMAIN_INTENT_KEYWORDS:
            kws = _DOMAIN_INTENT_KEYWORDS[domain]
            if kws:
                _INTENT_RULES.insert(0, (kws, key))
        log.info(f"Router: live-registered trained module '{key}' (domain={domain})")

    # ── Sync route ────────────────────────────────────────────────────────────

    def route(
        self,
        query:             str,
        use_llm_fallback:  bool              = True,
        context:           Optional[dict]    = None,
    ) -> dict:
        """
        Detect intent and dispatch query to the correct module.

        Returns:
            {
              "module":     str,
              "intent":     str,
              "confidence": float,   # 0.0 – 1.0
              "response":   Any,
              "query":      str,
            }
        """
        intent, module_key, confidence = self._detect_intent(query)

        if module_key == "unknown" and use_llm_fallback:
            module_key = self._llm_route(query)
            intent     = f"llm:{module_key}"
            confidence = 0.5

        if module_key not in self.modules:
            module_key = self.default_module
            intent     = f"default:{module_key}"
            confidence = 0.1

        response = self._dispatch(module_key, query, context)

        self._route_log.append({
            "query":      query[:120],
            "intent":     intent,
            "module":     module_key,
            "confidence": confidence,
        })

        return {
            "module":     module_key,
            "intent":     intent,
            "confidence": confidence,
            "response":   response,
            "query":      query,
        }

    # ── Async route ───────────────────────────────────────────────────────────

    async def async_route(
        self,
        query:             str,
        use_llm_fallback:  bool           = True,
        context:           Optional[dict] = None,
    ) -> dict:
        """Async version of route(). Uses think_async() for LLM fallback."""
        intent, module_key, confidence = self._detect_intent(query)

        if module_key == "unknown" and use_llm_fallback:
            module_key = await self._llm_route_async(query)
            intent     = f"llm:{module_key}"
            confidence = 0.5

        if module_key not in self.modules:
            module_key = self.default_module
            intent     = f"default:{module_key}"
            confidence = 0.1

        response = self._dispatch(module_key, query, context)

        self._route_log.append({
            "query":      query[:120],
            "intent":     intent,
            "module":     module_key,
            "confidence": confidence,
        })

        return {
            "module":     module_key,
            "intent":     intent,
            "confidence": confidence,
            "response":   response,
            "query":      query,
        }

    # ── Intent detection ──────────────────────────────────────────────────────

    def _detect_intent(self, query: str) -> tuple[str, str, float]:
        """
        Keyword-based intent detection with scoring.
        Returns (intent_label, module_key, confidence).
        Confidence = (matched_keywords / total_keywords_in_rule) clipped to [0.3, 1.0].
        """
        q = query.lower()
        best_kw, best_key, best_score = "unknown", "unknown", 0.0

        for keywords, module_key in _INTENT_RULES:
            matches = sum(1 for kw in keywords if kw in q)
            if matches == 0:
                continue
            score = min(1.0, 0.3 + (matches / len(keywords)) * 0.7)
            if score > best_score:
                best_score = score
                best_kw    = next(kw for kw in keywords if kw in q)
                best_key   = module_key

        return (best_kw, best_key, best_score)

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
        except Exception as exc:
            log.warning(f"LLM route fallback failed: {exc}")
        return self.default_module

    async def _llm_route_async(self, query: str) -> str:
        """Async LLM-based routing fallback."""
        available = list(self.modules.keys()) or ["m1"]
        prompt = (
            f"Available modules: {available}\n"
            f"User query: {query}\n\n"
            f"Which module key (one of {available}) best handles this? "
            "Reply with ONLY the module key, nothing else."
        )
        try:
            raw = await self.engine.think_async(prompt, temperature=0.0, max_tokens=10)
            key = raw.strip().lower().strip('"').strip("'")
            if key in self.modules:
                return key
        except Exception as exc:
            log.warning(f"Async LLM route fallback failed: {exc}")
        return self.default_module

    # ── Dispatch ──────────────────────────────────────────────────────────────

    def _dispatch(self, module_key: str, query: str, context: Optional[dict]) -> Any:
        """Call the module with the query (and optional context)."""
        module = self.modules.get(module_key)
        if module is None:
            return f"[Router] No module registered for '{module_key}'."
        try:
            if callable(module):
                try:
                    return module(query, context=context)
                except TypeError:
                    return module(query)
            for method_name in ("ask", "run", "process", "__call__"):
                method = getattr(module, method_name, None)
                if callable(method):
                    try:
                        return method(query, context=context)
                    except TypeError:
                        return method(query)
            return f"[Router] Module '{module_key}' has no callable interface."
        except Exception as e:
            log.error(f"Dispatch error for '{module_key}': {e}")
            return f"[Router] Dispatch error for '{module_key}': {e}"

    # ── Utility ───────────────────────────────────────────────────────────────

    def route_log(self) -> list[dict]:
        return list(self._route_log)

    def clear_log(self) -> None:
        self._route_log.clear()

    def stats(self) -> dict:
        module_counts   = Counter(e["module"]  for e in self._route_log)
        intent_counts   = Counter(e["intent"]  for e in self._route_log)
        avg_confidence  = (
            sum(e.get("confidence", 0) for e in self._route_log) / len(self._route_log)
            if self._route_log else 0.0
        )
        return {
            "registered_modules": list(self.modules.keys()),
            "default_module":     self.default_module,
            "total_routed":       len(self._route_log),
            "by_module":          dict(module_counts),
            "by_intent":          dict(intent_counts),
            "avg_confidence":     round(avg_confidence, 3),
        }

    def __repr__(self) -> str:
        return (
            f"<Router modules={list(self.modules.keys())} "
            f"routed={len(self._route_log)}>"
        )

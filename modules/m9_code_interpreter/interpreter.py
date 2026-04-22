"""
M9 CodeInterpreter — Execute user code safely and return structured results.

Supports: Python, JavaScript (Node), Bash, SQL (SQLite).
Each execution is isolated in a Sandbox with timeout + resource limits.
"""
from __future__ import annotations
import logging, time
from typing import Any, Dict, List, Optional

from .sandbox    import Sandbox
from .languages  import LanguageRegistry

log = logging.getLogger("m9.interpreter")

EXEC_TIMEOUT = 10  # seconds


class CodeInterpreter:
    """Primary interface for code execution."""

    def __init__(self, config: Optional[Dict] = None):
        self.config    = config or {}
        self.sandbox   = Sandbox(timeout=EXEC_TIMEOUT)
        self.registry  = LanguageRegistry()
        log.info("M9 CodeInterpreter initialized | timeout=%ds", EXEC_TIMEOUT)

    async def execute(
        self,
        code: str,
        language: str = "python",
        variables: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute `code` in the specified language.

        Returns:
            {
              "language": str,
              "stdout": str,
              "stderr": str,
              "result": Any,
              "error": str | None,
              "elapsed": float,
              "charts": [],     # future: matplotlib figures as b64
              "tables": [],     # future: DataFrame previews
            }
        """
        lang = language.lower().strip()
        runner = self.registry.get(lang)
        if not runner:
            return {
                "language": lang, "stdout": "", "stderr": "",
                "result": None, "error": f"Language '{lang}' not supported.",
                "elapsed": 0, "charts": [], "tables": [],
            }

        log.info("Executing %s (%d chars)", lang, len(code))
        t0 = time.monotonic()
        result = await self.sandbox.run(runner, code, variables or {})
        result["elapsed"] = round(time.monotonic() - t0, 3)
        result["language"] = lang
        return result

    def supported_languages(self) -> List[str]:
        return self.registry.list_languages()

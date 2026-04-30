"""M9 LanguageRegistry — Maps language names to runner callables."""
from __future__ import annotations
from typing import Callable, Dict, List, Optional
from .sandbox import python_runner, bash_runner, sql_runner


class LanguageRegistry:
    _RUNNERS: Dict[str, Callable] = {
        "python":  python_runner,
        "py":      python_runner,
        "python3": python_runner,
        "bash":    bash_runner,
        "sh":      bash_runner,
        "shell":   bash_runner,
        "sql":     sql_runner,
        "sqlite":  sql_runner,
    }

    def get(self, language: str) -> Optional[Callable]:
        return self._RUNNERS.get(language.lower())

    def list_languages(self) -> List[str]:
        return sorted(set(self._RUNNERS.keys()))

    def register(self, name: str, runner: Callable):
        self._RUNNERS[name.lower()] = runner

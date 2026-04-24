# core/plugins/registry.py — Platform plugin registry (Phase 4)
from __future__ import annotations
import importlib, logging, pkgutil
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

log = logging.getLogger("core.plugins.registry")

class Plugin:
    def __init__(self, name: str, description: str, run: Callable, permissions: List[str] = None):
        self.name = name; self.description = description
        self.run = run; self.permissions = permissions or []; self.enabled = True

class PluginRegistry:
    _instance: Optional["PluginRegistry"] = None

    def __init__(self): self._plugins: Dict[str, Plugin] = {}

    @classmethod
    def instance(cls) -> "PluginRegistry":
        if cls._instance is None: cls._instance = cls()
        return cls._instance

    def register(self, p: Plugin) -> None:
        self._plugins[p.name] = p; log.info(f"Plugin registered: {p.name}")

    def enable(self, name: str): 
        if name in self._plugins: self._plugins[name].enabled = True
    def disable(self, name: str):
        if name in self._plugins: self._plugins[name].enabled = False
    def get(self, name: str) -> Optional[Plugin]: return self._plugins.get(name)
    def list_enabled(self) -> List[Plugin]: return [p for p in self._plugins.values() if p.enabled]

    async def run_plugin(self, name: str, data: Any) -> Any:
        import asyncio
        p = self._plugins.get(name)
        if not p: raise ValueError(f"Plugin '{name}' not found")
        if not p.enabled: raise ValueError(f"Plugin '{name}' disabled")
        return await p.run(data) if asyncio.iscoroutinefunction(p.run) else p.run(data)

    def autodiscover(self, plugins_dir: str = "plugins") -> None:
        path = Path(plugins_dir)
        if not path.exists(): return
        for _, name, _ in pkgutil.iter_modules([str(path)]):
            try:
                mod = importlib.import_module(f"{plugins_dir}.{name}")
                if hasattr(mod, "PLUGIN"): self.register(mod.PLUGIN)
            except Exception as e: log.warning(f"Plugin {name} load failed: {e}")

    def status(self) -> List[dict]:
        return [{"name": p.name, "description": p.description, "enabled": p.enabled, "permissions": p.permissions}
                for p in self._plugins.values()]

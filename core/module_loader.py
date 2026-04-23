# ============================================================
# core/module_loader.py
# GENESIS — Dynamic Module Loader
#
# Section C: Model Registry + Loader
#
# DynamicModuleLoader:
#   - Singleton — one instance per process
#   - On startup: reads registry.json + MongoDB TrainedModule collection
#   - Instantiates TrainedModelModule for each trained entry
#   - Registers them with the Router live (no restart)
#   - On module_added event: picks up new module by key
#
# Called from:
#   - api/main.py lifespan on startup
#   - core/training_engine.py after Celery on_success
#   - api/websocket.py on module_added WebSocket event
# ============================================================

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from core.router import Router

log = logging.getLogger("core.module_loader")

_REGISTRY_PATH = Path(__file__).resolve().parent.parent / "models" / "registry.json"


class DynamicModuleLoader:
    """
    Singleton loader. Instantiate via DynamicModuleLoader.instance().
    """

    _instance: Optional["DynamicModuleLoader"] = None

    def __init__(self):
        self._router: Optional["Router"] = None
        self._loaded_keys: set[str] = set()

    @classmethod
    def instance(cls) -> "DynamicModuleLoader":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Wiring ────────────────────────────────────────────────────────────────

    def set_router(self, router: "Router"):
        """Called from api/dependencies.py after Router is created."""
        self._router = router

    # ── Startup load ──────────────────────────────────────────────────────────

    async def load_from_registry(self):
        """
        Called once at startup.
        Reads registry.json + MongoDB and instantiates all trained modules.
        """
        # From registry.json
        if _REGISTRY_PATH.exists():
            with open(_REGISTRY_PATH) as f:
                registry = json.load(f)
            for entry in registry.get("trained_models", []):
                key = entry.get("key")
                if key and key not in self._loaded_keys:
                    self._instantiate_and_register(entry)

        # From MongoDB (may have entries not yet in registry.json)
        try:
            from database.models_mongo import TrainedModule
            async for doc in TrainedModule.find(TrainedModule.is_active == True):
                if doc.key not in self._loaded_keys:
                    self._instantiate_and_register({
                        "key":          doc.key,
                        "domain":       doc.domain,
                        "adapter_path": doc.adapter_path,
                        "base_model":   doc.base_model,
                    })
        except Exception as e:
            log.warning(f"MongoDB load of TrainedModules failed (non-fatal): {e}")

        log.info(f"DynamicModuleLoader: {len(self._loaded_keys)} trained modules loaded.")

    # ── Live load (called after training completes) ───────────────────────────

    def load_module(self, module_key: str):
        """
        Called by TrainingEngine._notify_module_loader() on training completion.
        Reads registry.json for the new entry and registers immediately.
        """
        if _REGISTRY_PATH.exists():
            with open(_REGISTRY_PATH) as f:
                registry = json.load(f)
            entry = next(
                (m for m in registry.get("trained_models", []) if m["key"] == module_key),
                None,
            )
            if entry:
                self._instantiate_and_register(entry)
                log.info(f"Live-loaded new module: {module_key}")
            else:
                log.warning(f"load_module: '{module_key}' not found in registry.json")

    # ── Private ───────────────────────────────────────────────────────────────

    def _instantiate_and_register(self, entry: dict):
        """Create a TrainedModelModule and register it with the Router."""
        key = entry.get("key")
        if not key:
            return
        if key in self._loaded_keys:
            return

        try:
            from modules.trained_module import TrainedModelModule

            module = TrainedModelModule(
                module_key=key,
                domain=entry.get("domain", "general"),
                adapter_path=entry.get("adapter_path", ""),
                base_model=entry.get("base_model", "google/gemma-3-4b-it"),
            )

            if self._router:
                self._router.register_module(key, module)

            self._loaded_keys.add(key)
            log.info(f"Registered module '{key}' with router.")

        except Exception as e:
            log.error(f"Failed to instantiate module '{key}': {e}")

    # ── Status ────────────────────────────────────────────────────────────────

    def list_loaded(self) -> list[str]:
        return sorted(self._loaded_keys)

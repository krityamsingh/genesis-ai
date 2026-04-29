# config/feature_flags.py
# GENESIS — Runtime Feature Flags
#
# All new capabilities are gated behind flags.
# Default for every flag is OFF → system behaves identically to v2.
#
# Control via environment variables:
#   FEATURE_NEW_PIPELINE=off|shadow|on
#   FEATURE_CACHE=off|on
#   FEATURE_MODERATION=off|keyword|llm
#   FEATURE_MEMORY=off|on
#   FEATURE_PLUGINS=off|on
#   FEATURE_TOKEN_FAMILY=off|on
#   FEATURE_METRICS=off|on
#   FEATURE_TRACING=off|on
#
# "shadow" mode: run both old and new, log diffs, serve OLD response.
# This lets you validate the new pipeline with zero user impact.
# =============================================================================

from __future__ import annotations

import logging
import os
from enum import Enum

log = logging.getLogger("config.feature_flags")


class PipelineMode(str, Enum):
    OFF    = "off"     # old pipeline only (v2 behaviour)
    SHADOW = "shadow"  # run both, log diff, serve old response
    ON     = "on"      # new pipeline only


def _env(key: str, default: str) -> str:
    return os.getenv(key, default).lower().strip()


class FeatureFlags:
    """
    Singleton that reads feature flags from environment.
    Call .reload() to pick up changes without restart (e.g. in tests).
    """

    _instance: "FeatureFlags | None" = None

    def __init__(self):
        self.reload()

    @classmethod
    def instance(cls) -> "FeatureFlags":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reload(self) -> None:
        self.pipeline_mode = PipelineMode(_env("FEATURE_NEW_PIPELINE", "off"))
        self.cache_enabled = _env("FEATURE_CACHE", "off") == "on"
        self.memory_enabled = _env("FEATURE_MEMORY", "off") == "on"
        self.plugins_enabled = _env("FEATURE_PLUGINS", "off") == "on"
        self.moderation_level = _env("FEATURE_MODERATION", "off")  # off|keyword|llm
        self.token_family_enabled = _env("FEATURE_TOKEN_FAMILY", "off") == "on"
        self.metrics_enabled = _env("FEATURE_METRICS", "off") == "on"
        self.tracing_enabled = _env("FEATURE_TRACING", "off") == "on"
        log.debug(f"Feature flags loaded: pipeline={self.pipeline_mode} cache={self.cache_enabled} "
                  f"memory={self.memory_enabled} plugins={self.plugins_enabled} "
                  f"moderation={self.moderation_level} metrics={self.metrics_enabled}")

    @property
    def new_pipeline_active(self) -> bool:
        return self.pipeline_mode == PipelineMode.ON

    @property
    def shadow_mode(self) -> bool:
        return self.pipeline_mode == PipelineMode.SHADOW

    def as_dict(self) -> dict:
        return {
            "pipeline_mode":        self.pipeline_mode.value,
            "cache_enabled":        self.cache_enabled,
            "memory_enabled":       self.memory_enabled,
            "plugins_enabled":      self.plugins_enabled,
            "moderation_level":     self.moderation_level,
            "token_family_enabled": self.token_family_enabled,
            "metrics_enabled":      self.metrics_enabled,
            "tracing_enabled":      self.tracing_enabled,
        }


# Module-level singleton
flags = FeatureFlags.instance()

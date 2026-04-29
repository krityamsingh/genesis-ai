# ============================================================
# modules/trained_module.py
# GENESIS — Trained Model Module
#
# A BaseModule subclass that wraps a LoRA-fine-tuned adapter.
# Every query passes through LayerManager inference_mode first.
# Registered dynamically by DynamicModuleLoader — no restart needed.
#
# MODULE_NAME is set dynamically to the module_key
# (e.g. "trading_v1", "medical_v2") so the Router can route to it.
# ============================================================

from __future__ import annotations

import logging
import os
from typing import Optional, TYPE_CHECKING

from modules.base_module import BaseModule

if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph

log = logging.getLogger("modules.trained_module")


class TrainedModelModule(BaseModule):
    """
    Wraps a domain-specific LoRA fine-tuned adapter as a chat module.

    The base model + adapter are loaded lazily on first run() call
    to avoid GPU memory allocation for inactive modules.

    Args:
        module_key:   e.g. "trading_v1" — used as MODULE_NAME
        domain:       e.g. "trading" — used for layer config
        adapter_path: Absolute path to saved LoRA adapter directory
        base_model:   HuggingFace model ID the adapter was trained from
    """

    def __init__(
        self,
        module_key: str,
        domain: str,
        adapter_path: str,
        base_model: str = "google/gemma-3-4b-it",
        engine: Optional["GemmaEngine"] = None,
        kg: Optional["KnowledgeGraph"] = None,
    ):
        # Pass dummy engine/kg — trained modules use their own inference
        super().__init__(engine=engine, kg=kg, name=module_key)
        self.MODULE_NAME  = module_key
        self.domain       = domain
        self.adapter_path = adapter_path
        self.base_model   = base_model

        # Lazy-loaded
        self._model     = None
        self._tokenizer = None
        self._loaded    = False

    # ── Lazy model loader ─────────────────────────────────────────────────────

    def _ensure_loaded(self):
        if self._loaded:
            return
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
            from peft import PeftModel

            hf_token = os.getenv("HF_TOKEN", "")
            log.info(f"Loading trained module: {self.name} | adapter={self.adapter_path}")

            self._tokenizer = AutoTokenizer.from_pretrained(
                self.base_model,
                token=hf_token or None,
            )
            base = AutoModelForCausalLM.from_pretrained(
                self.base_model,
                device_map="auto",
                token=hf_token or None,
            )
            self._model = PeftModel.from_pretrained(base, self.adapter_path)
            self._model.eval()
            self._loaded = True
            log.info(f"Module {self.name} loaded successfully.")

        except ImportError as e:
            raise RuntimeError(
                f"Cannot load trained module — install torch, transformers, peft: {e}"
            )
        except Exception as e:
            log.error(f"Failed to load module {self.name}: {e}")
            raise

    # ── run() — the main interface ────────────────────────────────────────────

    def run(self, query: str) -> str:
        """
        1. Validate query via LayerManager inference_mode
        2. Load LoRA adapter (lazy)
        3. Run inference
        4. Return response string
        """
        # Layer validation
        try:
            from layers.layer_manager import LayerManager
            lm = LayerManager()
            validation = lm.validate_inference(query, domain=self.domain)
            if not validation.passed:
                first_fail = validation.failures[0]
                return (
                    f"[{self.name}] Query blocked by safety layer "
                    f"(L{first_fail.layer_id} {first_fail.layer_name}): "
                    f"{first_fail.description}"
                )
        except Exception as e:
            log.warning(f"Layer validation failed for {self.name}: {e}")
            # Non-fatal — proceed with inference

        # Inference
        try:
            self._ensure_loaded()
            import torch

            system_prompt = self._load_system_prompt()
            full_prompt   = f"{system_prompt}\n\nUser: {query}\nAssistant:"

            inputs = self._tokenizer(full_prompt, return_tensors="pt").to(
                self._model.device
            )
            with torch.no_grad():
                output = self._model.generate(
                    **inputs,
                    max_new_tokens=512,
                    temperature=0.2,
                    do_sample=True,
                    pad_token_id=self._tokenizer.eos_token_id,
                )
            decoded = self._tokenizer.decode(
                output[0][inputs["input_ids"].shape[1]:],
                skip_special_tokens=True,
            )
            return decoded.strip()

        except Exception as e:
            log.error(f"Inference error in {self.name}: {e}")
            return f"[{self.name}] Inference error: {e}"

    # ── Helper ────────────────────────────────────────────────────────────────

    def _load_system_prompt(self) -> str:
        """Load domain system prompt from prompts/training/<domain>.txt"""
        from pathlib import Path

        prompt_file = (
            Path(__file__).resolve().parent.parent
            / "prompts" / "training" / f"{self.domain}.txt"
        )
        if prompt_file.exists():
            return prompt_file.read_text(encoding="utf-8").strip()
        return f"You are a specialized AI assistant for the {self.domain} domain."

    def info(self) -> dict:
        """For admin panel / sidebar display."""
        return {
            "module_key":   self.name,
            "domain":       self.domain,
            "adapter_path": self.adapter_path,
            "base_model":   self.base_model,
            "loaded":       self._loaded,
            **self.stats(),
        }

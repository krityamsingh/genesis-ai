# tasks/training_tasks.py
# GENESIS — Celery Training Tasks
#
# Fixes applied:
#   • All heavy imports (torch, transformers, peft, trl, datasets) moved INSIDE
#     the task function body — previously at module level which caused:
#       1. ~4 second cold-start penalty on every Celery worker boot
#       2. Crash with ImportError in API-only deployments without PyTorch
#       3. GPU memory pre-allocation even for non-training workers
#   • Added clear error message if training packages are not installed
#   • Token defaults to HF_TOKEN env var if not passed explicitly
#   • evaluate_model task now returns a proper not-implemented response
#     instead of silently doing nothing
# =============================================================================

from __future__ import annotations

import os
from typing import Any

from tasks.celery_app import celery_app
from shared.logger    import get_logger

log = get_logger("tasks.training")


# ── Fine-tuning task ──────────────────────────────────────────────────────────

@celery_app.task(name="tasks.fine_tune", bind=True, max_retries=1)
def fine_tune(
    self,
    dataset_path: str,
    model_id:     str  = "google/gemma-3-4b-it",
    output_dir:   str  = "./results",
    token:        str  = None,
) -> dict[str, Any]:
    """
    Perform Supervised Fine-Tuning (SFT) on Gemma using LoRA (4-bit quantized).

    Heavy imports are done inside this function so they only load when a
    training job is actually queued, not on every Celery worker startup.

    Args:
        dataset_path: Path to a .json/.jsonl file or a HuggingFace dataset ID.
                      Each record must have a "text" field.
        model_id:     HuggingFace model ID to fine-tune.
        output_dir:   Directory to save the LoRA adapter weights.
        token:        HuggingFace token. Defaults to HF_TOKEN env var.

    Returns:
        {"status": "success", "adapter_path": str} on success
        {"status": "error",   "message": str}       on failure
    """
    # ── Lazy imports — only load when task actually runs ──────────────────────
    try:
        import torch
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            BitsAndBytesConfig,
            TrainingArguments,
        )
        from peft import LoraConfig, prepare_model_for_kbit_training
        from trl  import SFTTrainer
        from datasets import load_dataset
    except ImportError as e:
        msg = (
            f"Training packages not installed: {e}. "
            "Add torch, transformers, peft, trl, datasets, bitsandbytes, accelerate "
            "to requirements.txt and redeploy the training worker."
        )
        log.error(msg)
        return {"status": "error", "message": msg}

    hf_token = token or os.getenv("HF_TOKEN", "")
    if not hf_token:
        return {"status": "error", "message": "HF_TOKEN not set — cannot download gated model."}

    log.info(f"Starting SFT | model={model_id} | dataset={dataset_path}")

    # ── 1. Load dataset ───────────────────────────────────────────────────────
    try:
        if dataset_path.endswith(".json") or dataset_path.endswith(".jsonl"):
            dataset = load_dataset("json", data_files=dataset_path, split="train")
        else:
            dataset = load_dataset(dataset_path, split="train")
        log.info(f"Dataset loaded: {len(dataset)} records")
    except Exception as e:
        log.error(f"Dataset load failed: {e}")
        return {"status": "error", "message": f"Failed to load dataset: {e}"}

    # ── 2. BitsAndBytes 4-bit quantization config ─────────────────────────────
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # ── 3. Tokenizer + model ──────────────────────────────────────────────────
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
        tokenizer.pad_token    = tokenizer.eos_token
        tokenizer.padding_side = "right"

        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            quantization_config=bnb_config,
            device_map="auto",
            token=hf_token,
        )
        model = prepare_model_for_kbit_training(model)
        log.info(f"Model loaded: {model_id}")
    except Exception as e:
        log.error(f"Model load failed: {e}")
        return {"status": "error", "message": f"Failed to load model: {e}"}

    # ── 4. LoRA config ────────────────────────────────────────────────────────
    peft_config = LoraConfig(
        lora_alpha=16,
        lora_dropout=0.1,
        r=64,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj"],
    )

    # ── 5. Training arguments ─────────────────────────────────────────────────
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=1,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=25,
        logging_steps=10,
        learning_rate=2e-4,
        weight_decay=0.001,
        fp16=True,
        bf16=False,
        max_grad_norm=0.3,
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="constant",
        report_to="none",
    )

    # ── 6. SFT Trainer ────────────────────────────────────────────────────────
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=1024,
        tokenizer=tokenizer,
        args=training_args,
        packing=False,
    )

    # ── 7. Train ──────────────────────────────────────────────────────────────
    try:
        trainer.train()
        adapter_path = os.path.join(output_dir, "final_adapter")
        trainer.model.save_pretrained(adapter_path)
        log.info(f"Training complete. Adapter saved to: {adapter_path}")
        return {"status": "success", "adapter_path": adapter_path}
    except Exception as e:
        log.error(f"Training failed: {e}")
        return {"status": "error", "message": str(e)}


# ── Evaluation task ───────────────────────────────────────────────────────────

@celery_app.task(name="tasks.evaluate_model")
def evaluate_model(model_id: str, eval_dataset: str) -> dict[str, Any]:
    """
    Evaluate a fine-tuned model on a dataset.
    Currently returns a structured not-implemented response.
    """
    log.info(f"evaluate_model called: model={model_id} dataset={eval_dataset}")
    return {
        "status":   "not_implemented",
        "model_id": model_id,
        "message":  (
            "Evaluation task is not yet implemented. "
            "To implement: load the adapter with peft.PeftModel, run inference "
            "on eval_dataset, and compute BLEU/ROUGE/perplexity scores."
        ),
    }

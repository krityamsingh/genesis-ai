# ============================================================
# tasks/training_tasks.py  (UPGRADED)
# GENESIS — Celery Training Tasks
#
# Upgrades from original:
#   • fine_tune_with_registration — new task wrapping fine_tune
#     with auto on_success registration (calls training_engine)
#   • training_progress — updates DB epoch count per epoch
#   • auto_register_model — Section C+D trigger after training
#   • All heavy imports remain inside task body (no cold-start cost)
# ============================================================

from __future__ import annotations

import os
import logging
from typing import Any, Optional

from tasks.celery_app import celery_app
from shared.logger    import get_logger

log = get_logger("tasks.training")


# ── Original fine_tune (backwards compat) ─────────────────────────────────────

@celery_app.task(name="tasks.fine_tune", bind=True, max_retries=1)
def fine_tune(
    self,
    dataset_path: str,
    model_id:     str = "google/gemma-3-4b-it",
    output_dir:   str = "./results",
    token:        str = None,
) -> dict[str, Any]:
    try:
        import torch
        from transformers import (
            AutoModelForCausalLM, AutoTokenizer,
            BitsAndBytesConfig, TrainingArguments,
        )
        from peft import LoraConfig, prepare_model_for_kbit_training
        from trl  import SFTTrainer
        from datasets import load_dataset
    except ImportError as e:
        msg = f"Training packages not installed: {e}."
        log.error(msg)
        return {"status": "error", "message": msg}

    hf_token = token or os.getenv("HF_TOKEN", "")
    if not hf_token:
        return {"status": "error", "message": "HF_TOKEN not set."}

    log.info(f"SFT | model={model_id} | dataset={dataset_path}")

    try:
        if dataset_path.endswith((".json", ".jsonl")):
            dataset = load_dataset("json", data_files=dataset_path, split="train")
        else:
            dataset = load_dataset(dataset_path, split="train")
    except Exception as e:
        return {"status": "error", "message": f"Failed to load dataset: {e}"}

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True, bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True,
    )

    try:
        tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = "right"
        model = AutoModelForCausalLM.from_pretrained(
            model_id, quantization_config=bnb_config,
            device_map="auto", token=hf_token,
        )
        model = prepare_model_for_kbit_training(model)
    except Exception as e:
        return {"status": "error", "message": f"Model load failed: {e}"}

    peft_config = LoraConfig(
        lora_alpha=16, lora_dropout=0.1, r=64, bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj"],
    )
    training_args = TrainingArguments(
        output_dir=output_dir, num_train_epochs=1,
        per_device_train_batch_size=4, gradient_accumulation_steps=4,
        optim="paged_adamw_32bit", save_steps=25, logging_steps=10,
        learning_rate=2e-4, weight_decay=0.001, fp16=True, bf16=False,
        max_grad_norm=0.3, warmup_ratio=0.03, group_by_length=True,
        lr_scheduler_type="constant", report_to="none",
    )
    trainer = SFTTrainer(
        model=model, train_dataset=dataset, peft_config=peft_config,
        dataset_text_field="text", max_seq_length=1024,
        tokenizer=tokenizer, args=training_args, packing=False,
    )

    try:
        trainer.train()
        adapter_path = os.path.join(output_dir, "final_adapter")
        trainer.model.save_pretrained(adapter_path)
        log.info(f"Training complete → {adapter_path}")
        return {"status": "success", "adapter_path": adapter_path}
    except Exception as e:
        log.error(f"Training failed: {e}")
        return {"status": "error", "message": str(e)}


# ── fine_tune_with_registration ───────────────────────────────────────────────

@celery_app.task(name="tasks.fine_tune_with_registration", bind=True, max_retries=1)
def fine_tune_with_registration(
    self,
    job_id:       str,
    dataset_path: str,
    model_id:     str = "google/gemma-3-4b-it",
    output_dir:   str = "./results",
    domain:       str = "general",
    name:         str = "Trained Model",
    user_id:      Optional[str] = None,
) -> dict[str, Any]:
    """Full training pipeline with automatic post-training registration."""
    _update_job_status(job_id, "training")

    result = fine_tune(
        dataset_path=dataset_path,
        model_id=model_id,
        output_dir=output_dir,
    )

    if result.get("status") != "success":
        _update_job_status(job_id, "failed", error_msg=result.get("message"))
        return result

    auto_register_model.delay(
        job_id=job_id,
        domain=domain,
        name=name,
        adapter_path=result["adapter_path"],
        base_model=model_id,
        user_id=user_id,
    )
    return result


# ── auto_register_model ───────────────────────────────────────────────────────

@celery_app.task(name="tasks.auto_register_model")
def auto_register_model(
    job_id:       str,
    domain:       str,
    name:         str,
    adapter_path: str,
    base_model:   str,
    user_id:      Optional[str] = None,
) -> dict[str, Any]:
    """Register trained model → triggers module_loader + WS broadcast."""
    import asyncio

    async def _run():
        from core.training_engine import TrainingEngine
        engine = TrainingEngine()
        result = await engine.register_trained_model(
            job_id=job_id, domain=domain, name=name,
            adapter_path=adapter_path, base_model=base_model, user_id=user_id,
        )
        try:
            from api.websocket import broadcast_to_all
            await broadcast_to_all({
                "type": "module_added",
                "module_key": result["module_key"],
                "domain": domain,
            })
        except Exception as e:
            log.warning(f"WS broadcast failed: {e}")
        return result

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_run())
    finally:
        loop.close()


# ── training_progress ─────────────────────────────────────────────────────────

@celery_app.task(name="tasks.training_progress")
def training_progress(job_id: str, epoch: int, total_epochs: int) -> None:
    """Update TrainingJobDoc progress each epoch."""
    import asyncio

    async def _update():
        from database.models_mongo import TrainingJobDoc
        doc = await TrainingJobDoc.find_one(TrainingJobDoc.job_id == job_id)
        if doc:
            doc.progress_pct = int((epoch / total_epochs) * 100)
            doc.epochs_done  = epoch
            doc.status       = "training"
            await doc.save()

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_update())
    finally:
        loop.close()


# ── evaluate_model ────────────────────────────────────────────────────────────

@celery_app.task(name="tasks.evaluate_model")
def evaluate_model(model_id: str, eval_dataset: str) -> dict[str, Any]:
    log.info(f"evaluate_model: model={model_id} dataset={eval_dataset}")
    return {
        "status": "not_implemented",
        "model_id": model_id,
        "message": "To implement: load PeftModel, run eval, compute BLEU/ROUGE.",
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _update_job_status(job_id: str, status: str, error_msg: Optional[str] = None):
    import asyncio

    async def _run():
        from database.models_mongo import TrainingJobDoc
        doc = await TrainingJobDoc.find_one(TrainingJobDoc.job_id == job_id)
        if doc:
            doc.status = status
            if error_msg:
                doc.error_msg = error_msg
            await doc.save()

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_run())
    finally:
        loop.close()

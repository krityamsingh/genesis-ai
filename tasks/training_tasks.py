# tasks/training_tasks.py
from __future__ import annotations
from tasks.celery_app import celery_app
from shared.logger    import get_logger
import os
import torch
from typing import Dict, Any
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    pipeline,
    logging,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset

log = get_logger("tasks.training")


@celery_app.task(name="tasks.fine_tune")
def fine_tune(
    dataset_path: str,
    model_id: str = "google/gemma-3-4b-it",
    output_dir: str = "./results",
    token: str = None
):
    """
    Perform Supervised Fine-Tuning (SFT) on Gemma using LoRA.
    """
    print(f"[Training] Starting SFT for {model_id} using {dataset_path}...")

    # 1. Load Dataset
    try:
        if dataset_path.endswith(".json") or dataset_path.endswith(".jsonl"):
            dataset = load_dataset("json", data_files=dataset_path, split="train")
        else:
            dataset = load_dataset(dataset_path, split="train")
    except Exception as e:
        print(f"[Error] Failed to load dataset: {e}")
        return {"status": "error", "message": str(e)}

    # 2. BitsAndBytes Config (4-bit quantization)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 3. Load Model and Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_id, token=token)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        token=token
    )
    model = prepare_model_for_kbit_training(model)

    # 4. LoRA Config
    peft_config = LoraConfig(
        lora_alpha=16,
        lora_dropout=0.1,
        r=64,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj"]
    )

    # 5. Training Arguments
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
        max_steps=-1,
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="constant",
        report_to="none"
    )

    # 6. SFT Trainer
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

    # 7. Start Training
    try:
        trainer.train()
        trainer.model.save_pretrained(os.path.join(output_dir, "final_adapter"))
        print("[Training] Completed successfully.")
        return {"status": "success", "adapter_path": output_dir}
    except Exception as e:
        print(f"[Error] Training failed: {e}")
        return {"status": "error", "message": str(e)}


@celery_app.task(name="tasks.evaluate_model")
def evaluate_model(model_id: str, eval_dataset: str):
    log.info(f"[Task] evaluate_model model={model_id}")
    return {"status": "not_implemented", "model_id": model_id}

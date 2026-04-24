# core/model_router.py — Multi-model task router (Phase 4)
from __future__ import annotations
from typing import Literal

TaskType = Literal["simple_qa", "complex_reasoning", "code_gen", "creative", "default"]
MODEL_MAP = {"simple_qa": "gemma-3-1b", "complex_reasoning": "gemma-3-27b",
             "code_gen": "gemma-3-12b", "creative": "gemma-3-12b", "default": "gemma-3-4b"}
COST_PER_TOKEN = {"gemma-3-1b": 0.00001, "gemma-3-4b": 0.00004,
                  "gemma-3-12b": 0.00012, "gemma-3-27b": 0.00027}

def classify_task(query: str) -> TaskType:
    q = query.lower()
    if any(k in q for k in ["write code","implement","function","class","debug","fix this code"]): return "code_gen"
    if len(q) < 60 and "?" in q: return "simple_qa"
    if any(k in q for k in ["analyze","compare","explain why","reason","argue","evaluate"]): return "complex_reasoning"
    if any(k in q for k in ["write a story","poem","creative","imagine"]): return "creative"
    return "default"

def select_model(task: TaskType) -> str: return MODEL_MAP.get(task, MODEL_MAP["default"])
def estimate_cost(model: str, tokens: int) -> float: return round(COST_PER_TOKEN.get(model, 0.0001) * tokens, 6)

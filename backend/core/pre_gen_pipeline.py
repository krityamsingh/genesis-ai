# ============================================================
# core/pre_gen_pipeline.py
# GENESIS — Pre-Generation Pipeline (P0.1 – P0.5)
#
# Runs before any code is written. Every production AI coding
# tool (Cursor, Devin, Lovable, Traycer, Windsurf) arrives
# at the same pattern: think first, code second.
#
# P0.1  Intent depth check        — Gemma 4
# P0.2  Completeness check        — GPT-4o
# P0.3  Research toggle           — Gemini (Mode A) or KG (Mode B)
# P0.4  Architecture plan         — GPT-4o
# P0.5  Specialist model check    — Registry lookup
#
# Usage:
#   from core.pre_gen_pipeline import run_pre_generation
#   result = await run_pre_generation(task, use_public_research=False)
# ============================================================

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

from core.caller import call_ai, PROVIDER_GEMMA4, PROVIDER_GEMINI, PROVIDER_OPENAI
from core.models import PreGenResult

_PROMPTS_DIR  = Path(__file__).parent.parent / "prompts"
_REGISTRY_PATH = Path(__file__).parent.parent / "models" / "registry.json"

CONFIDENCE_THRESHOLD = int(os.getenv("RESEARCH_CONFIDENCE_THRESHOLD", "70"))

SIMPLE_TASK_TYPES = {"question", "explanation", "quick_fix", "one_liner"}


def run_pre_generation(
    task:              str,
    conversation:      list[dict] | None = None,
    use_public_research: bool            = False,
) -> PreGenResult:
    """
    Run the full pre-generation pipeline.

    Args:
        task:               The user's task / request
        conversation:       Previous conversation turns [{"role":..,"content":..}]
        use_public_research: Mode A (True) or Mode B (False, default)

    Returns:
        PreGenResult — either ready_to_generate, needs_clarification, or both
    """
    conversation = conversation or []

    # ── P0.1  Intent depth check ──────────────────────────
    intent = _check_intent(task)

    if intent["task_type"] in SIMPLE_TASK_TYPES:
        return PreGenResult(
            ready_to_generate=True,
            task_type=intent["task_type"],
            complexity_score=intent["complexity"],
        )

    # ── P0.2  Completeness check ──────────────────────────
    gaps = _check_completeness(task, conversation)

    if gaps["has_missing_info"]:
        return PreGenResult(
            needs_clarification=True,
            questions=gaps["questions"],
            task_type=intent["task_type"],
            complexity_score=intent["complexity"],
        )

    # ── P0.3  Research mode decision ──────────────────────
    confidence = intent.get("confidence", 100)
    activate_research = use_public_research or (confidence < CONFIDENCE_THRESHOLD)

    if activate_research:
        research_brief = _run_public_research(task)
    else:
        research_brief = _search_genesis_memory(task)

    # ── P0.4  Architecture plan ───────────────────────────
    arch_plan = _build_architecture_plan(task, research_brief)

    # ── P0.5  Specialist model check ─────────────────────
    specialist = _check_specialist_registry(intent["task_type"])

    return PreGenResult(
        ready_to_generate=True,
        research_brief=research_brief,
        architecture_plan=arch_plan,
        specialist_model=specialist,
        task_type=intent["task_type"],
        complexity_score=intent["complexity"],
        use_research=activate_research,
    )


# ── P0.1 ─────────────────────────────────────────────────────

def _check_intent(task: str) -> dict:
    """Classify task type and complexity using Gemma 4."""
    prompt = (
        f"Classify this task and return JSON only.\n"
        f"Task: {task}\n\n"
        f"Return exactly: "
        f'{{\"task_type\": \"<code_generation|bug_fix|question|explanation|quick_fix|one_liner|research|simulation>\", '
        f'\"complexity\": <0-100>, '
        f'\"confidence\": <0-100>, '
        f'\"language\": \"<python|javascript|typescript|other|unknown>\"}}'
    )
    raw = call_ai(prompt, provider=PROVIDER_GEMMA4, temperature=0.0, max_tokens=120)
    try:
        cleaned = _strip_json_fences(raw)
        return json.loads(cleaned)
    except Exception:
        return {
            "task_type":  "code_generation",
            "complexity":  60,
            "confidence":  80,
            "language":   "unknown",
        }


# ── P0.2 ─────────────────────────────────────────────────────

def _check_completeness(task: str, conversation: list[dict]) -> dict:
    """Ask GPT-4o if the task has enough information to proceed."""
    conv_text = "\n".join(
        f"{t['role'].upper()}: {t['content']}" for t in conversation[-6:]
    ) if conversation else "No prior conversation."

    template = _load_prompt("pre_gen/completeness.txt")
    if template:
        prompt = template.replace("{task}", task).replace("{conversation}", conv_text)
    else:
        prompt = (
            f"You are checking if a coding task has enough information to implement correctly.\n\n"
            f"Recent conversation:\n{conv_text}\n\n"
            f"Task: {task}\n\n"
            f"Is any critical information missing? "
            f"Only ask if truly necessary (missing framework, database type, auth method, deployment target).\n"
            f"Return JSON: "
            f'{{\"has_missing_info\": true|false, '
            f'\"questions\": [\"question 1\", \"question 2\"]}} '
            f"Maximum 3 questions. If nothing is missing return has_missing_info: false."
        )

    raw = call_ai(prompt, provider=PROVIDER_OPENAI, temperature=0.0, max_tokens=300)
    try:
        cleaned = _strip_json_fences(raw)
        data = json.loads(cleaned)
        return {
            "has_missing_info": bool(data.get("has_missing_info", False)),
            "questions": data.get("questions", [])[:3],
        }
    except Exception:
        return {"has_missing_info": False, "questions": []}


# ── P0.3 Mode A ──────────────────────────────────────────────

def _run_public_research(task: str) -> str:
    """Mode A — Gemini searches for existing solutions and best practices."""
    prompt = (
        f"You are a research assistant for a code generation system.\n\n"
        f"Task to implement: {task}\n\n"
        f"Research and provide a structured brief covering:\n"
        f"1. Best existing libraries or packages for this task\n"
        f"2. Recommended approach and architecture pattern\n"
        f"3. Common pitfalls and how to avoid them\n"
        f"4. Any relevant GitHub repos or official documentation\n"
        f"5. The most idiomatic way to implement this in the target language\n\n"
        f"NEVER assume a library is available without confirming it exists.\n"
        f"Keep the brief under 600 words. Focus on what directly helps write the code."
    )
    return call_ai(prompt, provider=PROVIDER_GEMINI, temperature=0.2, max_tokens=800)


# ── P0.3 Mode B ──────────────────────────────────────────────

def _search_genesis_memory(task: str) -> str:
    """Mode B — search Genesis's own KnowledgeGraph for relevant past knowledge."""
    try:
        from core.knowledge_graph import KnowledgeGraph
        import os
        kg = KnowledgeGraph(persist_dir=os.getenv("KG_PERSIST_DIR", ""))
        results = kg.search("knowledge", task, n_results=3)
        if results:
            combined = "\n\n".join(results)
            return f"Relevant knowledge from Genesis memory:\n{combined}"
    except Exception:
        pass
    return ""


# ── P0.4 ─────────────────────────────────────────────────────

def _build_architecture_plan(task: str, research_brief: str) -> str:
    """GPT-4o designs the full architecture before any code is written."""
    template = _load_prompt("pre_gen/arch_plan.txt")
    research_section = (
        f"\nResearch findings:\n{research_brief}\n" if research_brief else ""
    )

    if template:
        prompt = (
            template
            .replace("{task}", task)
            .replace("{research}", research_brief or "No research available.")
        )
    else:
        prompt = (
            f"You are a senior software architect. Design a complete implementation plan.\n"
            f"NEVER write actual code. Only design the plan.\n\n"
            f"Task: {task}\n"
            f"{research_section}\n"
            f"Provide:\n"
            f"1. File structure (list every file needed)\n"
            f"2. Every function/class signature with types\n"
            f"3. Data flow (how data moves through the system)\n"
            f"4. All dependencies needed (only confirmed-existing packages)\n"
            f"5. Edge cases to handle\n"
            f"6. Test strategy\n\n"
            f"Be specific and complete. The code generator will follow this plan exactly."
        )

    return call_ai(prompt, provider=PROVIDER_OPENAI, temperature=0.2, max_tokens=1500)


# ── P0.5 ─────────────────────────────────────────────────────

def _check_specialist_registry(task_type: str) -> Optional[str]:
    """Check if a trained specialist model exists for this task type."""
    try:
        if not _REGISTRY_PATH.exists():
            return None
        with open(_REGISTRY_PATH) as f:
            registry = json.load(f)
        for model in registry.get("models", []):
            if model.get("task_type") == task_type:
                return model.get("key")
    except Exception:
        pass
    return None


# ── Helpers ───────────────────────────────────────────────────

def _load_prompt(relative_path: str) -> Optional[str]:
    try:
        path = _PROMPTS_DIR / relative_path
        if path.exists():
            return path.read_text(encoding="utf-8")
    except Exception:
        pass
    return None


def _strip_json_fences(text: str) -> str:
    clean = re.sub(r"```(?:json)?", "", text).strip()
    return clean.rstrip("`").strip()

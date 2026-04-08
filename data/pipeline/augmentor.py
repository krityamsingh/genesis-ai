# data/pipeline/augmentor.py
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from core.gemma_engine import GemmaEngine


def augment_with_summary(text: str, engine: "GemmaEngine") -> str:
    """Append a Gemma-generated summary to the text."""
    summary = engine.think(
        f"Summarise in 2 sentences:\n{text[:3000]}",
        max_tokens=150,
        temperature=0.3,
    )
    return f"{text}\n\n[SUMMARY]: {summary}"


def augment_with_questions(text: str, engine: "GemmaEngine",
                            n: int = 3) -> str:
    """Append N questions that can be answered from the text."""
    qs = engine.think(
        f"List {n} key questions answered by this text:\n{text[:3000]}",
        max_tokens=200,
        temperature=0.5,
    )
    return f"{text}\n\n[KEY QUESTIONS]:\n{qs}"

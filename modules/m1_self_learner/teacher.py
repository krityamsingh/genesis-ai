# ============================================================
# modules/m1_self_learner/teacher.py
# GENESIS M1 — Teacher Module
#
# Converts stored knowledge → human-readable outputs:
#   explain, quiz, flashcards, study plan, hypotheses,
#   eli5, deep-dive, compare, summarise
#
# All methods use GemmaEngine + KnowledgeGraph search
# ============================================================

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


# ════════════════════════════════════════════════════════════
# 📦  Output Models
# ════════════════════════════════════════════════════════════

@dataclass
class QuizQuestion:
    question:  str
    options:   list[str]     # ["A) ...", "B) ...", "C) ...", "D) ..."]
    answer:    str            # "A", "B", "C", or "D"
    explanation: str = ""

    def format(self, show_answer: bool = False) -> str:
        lines = [self.question, ""] + self.options
        if show_answer:
            lines += ["", f"✅ Answer: {self.answer}", self.explanation]
        return "\n".join(lines)


@dataclass
class Flashcard:
    front: str    # question / term
    back:  str    # answer / definition
    domain: str = ""

    def format(self) -> str:
        return f"Q: {self.front}\nA: {self.back}"


@dataclass
class StudyPlan:
    topic:   str
    duration: str           # e.g. "2 weeks"
    weeks:   list[dict]     # [{week: 1, focus: "...", tasks: [...]}]
    resources: list[str]

    def format(self) -> str:
        lines = [f"📚 Study Plan: {self.topic}",
                 f"⏱️  Duration: {self.duration}", ""]
        for w in self.weeks:
            lines.append(f"Week {w.get('week', '?')}: {w.get('focus', '')}")
            for task in w.get("tasks", []):
                lines.append(f"  • {task}")
            lines.append("")
        if self.resources:
            lines += ["📖 Recommended resources:"]
            lines += [f"  • {r}" for r in self.resources]
        return "\n".join(lines)


# ════════════════════════════════════════════════════════════
# 👨‍🏫  Teacher
# ════════════════════════════════════════════════════════════

class Teacher:
    """
    Uses stored knowledge + Gemma to teach topics back
    in various formats and difficulty levels.
    """

    def __init__(self, engine: GemmaEngine, kg: KnowledgeGraph):
        self.engine = engine
        self.kg     = kg

    # ────────────────────────────────────────────────────────
    # EXPLAIN
    # ────────────────────────────────────────────────────────

    def explain(self, topic: str, level: str = "intermediate") -> str:
        """
        Explain a topic using stored knowledge.
        level: beginner | intermediate | advanced | eli5
        """
        context = self._get_context(topic)
        style_map = {
            "beginner":     "simple language, analogies, no jargon",
            "intermediate": "clear and structured, some technical terms explained",
            "advanced":     "technical depth, assume expert background",
            "eli5":         "explain like I'm 5 — use toys and simple stories",
        }
        style = style_map.get(level, style_map["intermediate"])

        return self.engine.think(
            prompt=f"Explain: {topic}",
            system_prompt=(
                f"Teaching style: {style}\n"
                f"Use this knowledge:\n{context}\n\n"
                "Structure: Brief intro → Core idea → Examples → Key takeaway."
            ),
            temperature=0.5,
            max_tokens=1024,
        )

    def eli5(self, topic: str) -> str:
        """Explain Like I'm 5."""
        return self.explain(topic, level="eli5")

    def deep_dive(self, topic: str) -> str:
        """Advanced deep-dive with full technical detail."""
        return self.explain(topic, level="advanced")

    # ────────────────────────────────────────────────────────
    # QUIZ
    # ────────────────────────────────────────────────────────

    def generate_quiz(self, topic: str,
                      n_questions: int = 5,
                      difficulty: str = "intermediate") -> list[QuizQuestion]:
        """Generate multiple-choice quiz questions from stored knowledge."""
        context = self._get_context(topic, n=6)

        raw = self.engine.think(
            prompt=(
                f"Create {n_questions} multiple-choice questions about: {topic}\n"
                f"Difficulty: {difficulty}\n\n"
                f"Knowledge base:\n{context}\n\n"
                "Return ONLY JSON array:\n"
                '[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], '
                '"answer": "A", "explanation": "..."}]'
            ),
            system_prompt="Return valid JSON only. No markdown, no explanation.",
            temperature=0.5,
            max_tokens=2048,
        )

        questions = self._parse_json_list(raw)
        result = []
        for q in questions:
            try:
                result.append(QuizQuestion(
                    question=q["question"],
                    options=q["options"],
                    answer=q["answer"],
                    explanation=q.get("explanation", ""),
                ))
            except (KeyError, TypeError):
                continue
        return result

    def quiz_text(self, topic: str, n_questions: int = 3,
                  show_answers: bool = False) -> str:
        """Return quiz as formatted text string."""
        questions = self.generate_quiz(topic, n_questions)
        if not questions:
            return f"Could not generate quiz for '{topic}'. Try adding more knowledge first."

        parts = [f"📝 Quiz: {topic}\n{'='*40}\n"]
        for i, q in enumerate(questions, 1):
            parts.append(f"Q{i}. {q.format(show_answer=show_answers)}\n")
        return "\n".join(parts)

    # ────────────────────────────────────────────────────────
    # FLASHCARDS
    # ────────────────────────────────────────────────────────

    def generate_flashcards(self, topic: str,
                             n_cards: int = 10) -> list[Flashcard]:
        """Generate flashcards for active recall practice."""
        context = self._get_context(topic, n=5)

        raw = self.engine.think(
            prompt=(
                f"Create {n_cards} flashcards for: {topic}\n\n"
                f"Knowledge:\n{context}\n\n"
                "Return JSON array:\n"
                '[{"front": "question or term", "back": "answer or definition", "domain": "..."}]'
            ),
            system_prompt="Return valid JSON only.",
            temperature=0.4,
            max_tokens=1500,
        )

        cards_data = self._parse_json_list(raw)
        return [
            Flashcard(
                front=c.get("front", ""),
                back=c.get("back", ""),
                domain=c.get("domain", topic),
            )
            for c in cards_data if c.get("front")
        ]

    def flashcards_text(self, topic: str, n_cards: int = 5) -> str:
        cards = self.generate_flashcards(topic, n_cards)
        if not cards:
            return f"Could not generate flashcards for '{topic}'."
        lines = [f"🃏 Flashcards: {topic}\n"]
        for i, card in enumerate(cards, 1):
            lines.append(f"[{i}] {card.format()}\n")
        return "\n".join(lines)

    # ────────────────────────────────────────────────────────
    # STUDY PLAN
    # ────────────────────────────────────────────────────────

    def create_study_plan(self, topic: str,
                           duration: str = "2 weeks") -> StudyPlan:
        """Create a structured study plan for a topic."""
        context = self._get_context(topic)

        raw = self.engine.think(
            prompt=(
                f"Create a {duration} study plan for: {topic}\n\n"
                f"Prior knowledge in system:\n{context}\n\n"
                "Return JSON:\n"
                '{"topic": "...", "duration": "...", '
                '"weeks": [{"week": 1, "focus": "...", "tasks": ["task1", "task2"]}], '
                '"resources": ["resource1"]}'
            ),
            system_prompt="Return valid JSON only.",
            temperature=0.5,
            max_tokens=1500,
        )

        try:
            clean = re.sub(r"```(?:json)?", "", raw).strip()
            data  = json.loads(clean)
            return StudyPlan(
                topic=data.get("topic", topic),
                duration=data.get("duration", duration),
                weeks=data.get("weeks", []),
                resources=data.get("resources", []),
            )
        except Exception:
            return StudyPlan(
                topic=topic, duration=duration,
                weeks=[{"week": 1, "focus": "Review basics",
                        "tasks": [raw[:200]]}],
                resources=[],
            )

    # ────────────────────────────────────────────────────────
    # HYPOTHESES
    # ────────────────────────────────────────────────────────

    def generate_hypotheses(self, topic: str, n: int = 3) -> str:
        """Generate novel research hypotheses from stored knowledge."""
        context = self._get_context(topic, n=6)

        return self.engine.think(
            prompt=(
                f"Knowledge about {topic}:\n{context}\n\n"
                f"Generate {n} novel, testable research hypotheses.\n"
                "For each:\n"
                "  • Hypothesis (clear statement)\n"
                "  • Reasoning (why it might be true)\n"
                "  • Test method (how to verify)\n"
                "  • Impact score 1-10"
            ),
            system_prompt=(
                "You are a world-class research scientist. "
                "Generate creative but scientifically grounded hypotheses."
            ),
            temperature=0.9,
            max_tokens=1500,
        )

    # ────────────────────────────────────────────────────────
    # COMPARE
    # ────────────────────────────────────────────────────────

    def compare(self, topic_a: str, topic_b: str) -> str:
        """Compare two topics using stored knowledge."""
        ctx_a = self._get_context(topic_a, n=3)
        ctx_b = self._get_context(topic_b, n=3)

        return self.engine.think(
            prompt=(
                f"Compare '{topic_a}' vs '{topic_b}'.\n\n"
                f"Knowledge about {topic_a}:\n{ctx_a}\n\n"
                f"Knowledge about {topic_b}:\n{ctx_b}"
            ),
            system_prompt=(
                "Create a clear comparison with:\n"
                "1. Similarities\n2. Differences\n"
                "3. When to use each\n4. Verdict"
            ),
            temperature=0.5,
        )

    # ────────────────────────────────────────────────────────
    # SUMMARISE
    # ────────────────────────────────────────────────────────

    def summarise_all(self, n_chunks: int = 10) -> str:
        """Summarise everything currently in the knowledge base."""
        all_k = "\n\n---\n\n".join(
            self.kg.search("knowledge", "everything", n_results=n_chunks)
        )
        if not all_k.strip():
            return "Knowledge base is empty. Feed me something first!"

        return self.engine.think(
            prompt=f"Summarise all knowledge:\n{all_k}",
            system_prompt=(
                "Create a well-organised summary with sections by domain. "
                "Include key skills, concepts, and facts. "
                "End with 'What I still need to learn'."
            ),
            temperature=0.3,
            max_tokens=2048,
        )

    def answer_question(self, question: str) -> str:
        """Answer a question using stored knowledge."""
        context = self._get_context(question, n=5)
        if not context.strip():
            return (
                "I don't have knowledge about this yet. "
                "Feed me a relevant resource first!"
            )

        return self.engine.think(
            prompt=f"Question: {question}",
            system_prompt=(
                f"Answer using ONLY this knowledge:\n{context}\n\n"
                "Be direct and accurate. "
                "If knowledge is insufficient, say so clearly."
            ),
            temperature=0.4,
        )

    # ────────────────────────────────────────────────────────
    # PRIVATE
    # ────────────────────────────────────────────────────────

    def _get_context(self, query: str, n: int = 5) -> str:
        """Retrieve and join knowledge chunks for a query."""
        chunks = self.kg.search("knowledge", query, n_results=n)
        if not chunks:
            return f"[No knowledge found for: {query}]"
        return "\n\n---\n\n".join(chunks)

    @staticmethod
    def _parse_json_list(raw: str) -> list[dict]:
        """Parse a JSON array from Gemma output."""
        clean = re.sub(r"```(?:json)?", "", raw).strip()
        # Find first [...] block
        match = re.search(r"\[.*\]", clean, re.DOTALL)
        if match:
            clean = match.group(0)
        try:
            result = json.loads(clean)
            return result if isinstance(result, list) else []
        except json.JSONDecodeError:
            return []

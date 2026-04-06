# ============================================================
# modules/m1_self_learner/__init__.py
# GENESIS M1 — Public API
#
# Single import point. Usage:
#
#   from modules.m1_self_learner import M1
#
#   m1 = M1(engine, kg)
#   m1.learn("https://youtube.com/...")
#   m1.learn("path/to/file.pdf")
#   m1.learn("some raw text")
#   m1.teach("Python decorators")
#   m1.quiz("machine learning")
#   m1.flashcards("neural networks")
#   m1.study_plan("deep learning", "4 weeks")
#   m1.hypotheses("quantum computing")
#   m1.compare("PyTorch", "TensorFlow")
#   m1.summarise()
#   m1.ask("What is backpropagation?")
#   m1.connections()
#   m1.gaps("reinforcement learning")
#   m1.stats()
#
# Colab-compatible: all sync, no event loop needed here.
# ============================================================

from __future__ import annotations

from typing import TYPE_CHECKING

from modules.m1_self_learner.ingestion       import Ingestion
from modules.m1_self_learner.skill_extractor import (
    SkillExtractor, ExtractionResult, Skill, Concept
)
from modules.m1_self_learner.knowledge_builder import (
    KnowledgeBuilder, LearningSession, KnowledgeGap
)
from modules.m1_self_learner.teacher import (
    Teacher, QuizQuestion, Flashcard, StudyPlan
)

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


# ════════════════════════════════════════════════════════════
# 🧠  M1  — Unified Self-Learner Interface
# ════════════════════════════════════════════════════════════

class M1:
    """
    GENESIS M1 Self-Learner.

    Unified interface that wires together:
        Ingestion → SkillExtractor → KnowledgeBuilder → Teacher

    Drop-in replacement for the old SelfLearner class.
    All old method names (learn_from_text, search_knowledge,
    teach_back) still work for backwards compatibility.
    """

    def __init__(self, engine: GemmaEngine, kg: KnowledgeGraph):
        self.engine  = engine
        self.kg      = kg
        self.builder = KnowledgeBuilder(engine, kg)
        self.teacher = Teacher(engine, kg)
        print("[M1] Self-Learner ready — Ingestion • SkillExtractor • KnowledgeBuilder • Teacher")

    # ────────────────────────────────────────────────────────
    # 📥  LEARN  (smart router)
    # ────────────────────────────────────────────────────────

    def learn(self, source: str) -> dict:
        """
        Smart router — detects input type automatically:
          http(s)://...  → learn_from_url
          *.pdf          → learn_from_pdf
          *.mp3/mp4/...  → learn_from_audio
          existing file  → learn_from_file
          everything else → learn_from_text
        """
        import os
        s = source.strip()

        if s.startswith("http://") or s.startswith("https://"):
            return self.learn_from_url(s)

        if os.path.exists(s):
            ext = os.path.splitext(s)[1].lower()
            if ext == ".pdf":
                return self.learn_from_pdf(s)
            if ext in {".mp3", ".mp4", ".m4a", ".wav",
                       ".ogg", ".opus", ".webm", ".mkv"}:
                return self.learn_from_audio(s)
            return self.learn_from_file(s)

        return self.learn_from_text(s)

    def learn_from_text(self, text: str,
                        source: str = "direct_input") -> dict:
        return self.builder.learn_from_text(text, source)

    def learn_from_url(self, url: str) -> dict:
        return self.builder.learn_from_url(url)

    def learn_from_pdf(self, pdf_path: str) -> dict:
        return self.builder.learn_from_pdf(pdf_path)

    def learn_from_file(self, file_path: str) -> dict:
        return self.builder.learn_from_file(file_path)

    def learn_from_audio(self, audio_path: str,
                          source_label: str = None) -> dict:
        return self.builder.learn_from_audio(audio_path, source_label)

    def learn_from_youtube_data(
        self,
        audio_transcript: str,
        visual_analysis:  str,
        url:              str,
        language:         str = "en",
    ) -> dict:
        """Called by the Telegram/MegaSaverBot pipeline."""
        return self.builder.learn_from_youtube_data(
            audio_transcript, visual_analysis, url, language
        )

    # ────────────────────────────────────────────────────────
    # 🔍  SEARCH
    # ────────────────────────────────────────────────────────

    def search_knowledge(self, query: str, n: int = 5) -> list[str]:
        return self.builder.search_knowledge(query, n)

    def ask(self, question: str) -> str:
        """Answer a question from stored knowledge."""
        return self.teacher.answer_question(question)

    # ────────────────────────────────────────────────────────
    # 👨‍🏫  TEACH
    # ────────────────────────────────────────────────────────

    def teach(self, topic: str,
              level: str = "intermediate") -> str:
        return self.teacher.explain(topic, level)

    # backwards compat alias
    def teach_back(self, topic: str) -> str:
        return self.teach(topic)

    def eli5(self, topic: str) -> str:
        return self.teacher.eli5(topic)

    def deep_dive(self, topic: str) -> str:
        return self.teacher.deep_dive(topic)

    # ────────────────────────────────────────────────────────
    # 📝  QUIZ & STUDY TOOLS
    # ────────────────────────────────────────────────────────

    def quiz(self, topic: str, n: int = 3,
             show_answers: bool = False) -> str:
        return self.teacher.quiz_text(topic, n, show_answers)

    def flashcards(self, topic: str, n: int = 5) -> str:
        return self.teacher.flashcards_text(topic, n)

    def study_plan(self, topic: str,
                   duration: str = "2 weeks") -> str:
        plan = self.teacher.create_study_plan(topic, duration)
        return plan.format()

    def hypotheses(self, topic: str, n: int = 3) -> str:
        return self.teacher.generate_hypotheses(topic, n)

    def compare(self, topic_a: str, topic_b: str) -> str:
        return self.teacher.compare(topic_a, topic_b)

    def summarise(self) -> str:
        return self.teacher.summarise_all()

    # ────────────────────────────────────────────────────────
    # 🔗  ANALYSIS
    # ────────────────────────────────────────────────────────

    def connections(self) -> str:
        return self.builder.find_connections()

    def gaps(self, topic: str) -> list[KnowledgeGap]:
        return self.builder.detect_gaps(topic)

    def merge(self, topic: str) -> str:
        return self.builder.merge_knowledge(topic)

    def stats(self) -> dict:
        return self.builder.learning_stats()

    # ────────────────────────────────────────────────────────
    # 🖨️  __repr__
    # ────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        s = self.stats()
        return (
            f"<M1 sessions={s['total_sessions']} "
            f"domains={s['domains_covered']}>"
        )


# ── Backwards-compat alias (old code used SelfLearner) ──────
SelfLearner = M1

__all__ = [
    "M1", "SelfLearner",
    "Ingestion",
    "SkillExtractor", "ExtractionResult", "Skill", "Concept",
    "KnowledgeBuilder", "LearningSession", "KnowledgeGap",
    "Teacher", "QuizQuestion", "Flashcard", "StudyPlan",
]

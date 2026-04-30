# tests/unit/test_m1.py
import pytest


class TestIngestion:
    def test_from_text(self):
        from modules.m1_self_learner.ingestion import Ingestion
        result = Ingestion.from_text("  Hello world  ")
        assert result == "Hello world"

    def test_make_doc_id_stable(self):
        from modules.m1_self_learner.ingestion import Ingestion
        id1 = Ingestion.make_doc_id("same text")
        id2 = Ingestion.make_doc_id("same text")
        assert id1 == id2 and len(id1) == 16

    def test_make_doc_id_prefix(self):
        from modules.m1_self_learner.ingestion import Ingestion
        doc_id = Ingestion.make_doc_id("text", prefix="u_")
        assert doc_id.startswith("u_")


class TestSkillExtractor:
    def test_smart_truncate_short(self):
        from modules.m1_self_learner.skill_extractor import SkillExtractor
        text   = "Short text"
        result = SkillExtractor._smart_truncate(text, 1000)
        assert result == text

    def test_smart_truncate_long(self):
        from modules.m1_self_learner.skill_extractor import SkillExtractor
        text   = "x" * 10000
        result = SkillExtractor._smart_truncate(text, 100)
        assert len(result) <= 150

    def test_hashlib_at_top(self):
        import inspect
        import modules.m1_self_learner.skill_extractor as m
        src   = inspect.getsource(m)
        lines = src.splitlines()
        idx   = next(i for i, l in enumerate(lines) if "import hashlib" in l)
        assert idx < 10, f"hashlib should be at top, found at line {idx}"

    def test_extract_and_store(self, engine, kg):
        from modules.m1_self_learner.skill_extractor import SkillExtractor
        ext    = SkillExtractor(engine, kg)
        result = ext.extract_and_store(
            "Python decorators allow adding behaviour to functions.", source="test"
        )
        assert result.domain
        assert result.source == "test"
        assert kg.count("knowledge") > 0

    def test_dataclasses(self):
        from modules.m1_self_learner.skill_extractor import Skill, Concept
        s = Skill(name="Test", level="beginner", domain="cs",
                  description="desc", source="test")
        assert "SKILL: Test" in s.to_text()
        c = Concept(name="Concept", definition="def", domain="cs", source="test")
        assert "CONCEPT: Concept" in c.to_text()


class TestKnowledgeBuilder:
    def test_learn_from_text(self, engine, kg):
        from modules.m1_self_learner.knowledge_builder import KnowledgeBuilder
        builder = KnowledgeBuilder(engine, kg)
        result  = builder.learn_from_text("Python is a high-level programming language.")
        assert "response" in result
        assert result["error"] is None

    def test_learning_stats(self, engine, kg):
        from modules.m1_self_learner.knowledge_builder import KnowledgeBuilder
        builder = KnowledgeBuilder(engine, kg)
        builder.learn_from_text("Test content")
        stats   = builder.learning_stats()
        assert stats["total_sessions"] == 1

    def test_error_handling(self, engine, kg):
        from modules.m1_self_learner.knowledge_builder import KnowledgeBuilder
        builder = KnowledgeBuilder(engine, kg)
        result  = builder.learn_from_url("https://this-url-does-not-exist-xyz.invalid/")
        assert result["error"] is not None


class TestTeacher:
    def test_explain(self, engine, kg_with_data):
        from modules.m1_self_learner.teacher import Teacher
        t   = Teacher(engine, kg_with_data)
        out = t.explain("Python")
        assert len(out) > 0

    def test_quiz_text(self, engine, kg_with_data):
        from modules.m1_self_learner.teacher import Teacher
        t   = Teacher(engine, kg_with_data)
        out = t.quiz_text("Python", n_questions=2)
        assert isinstance(out, str)

    def test_answer_question_empty_kg(self, engine, kg):
        from modules.m1_self_learner.teacher import Teacher
        t   = Teacher(engine, kg)
        out = t.answer_question("What is X?")
        assert isinstance(out, str)


class TestM1Facade:
    def test_learn_text(self, m1):
        result = m1.learn("Python is great for data science.")
        assert "response" in result

    def test_learn_router_text(self, m1):
        result = m1.learn("This is plain text content about ML.")
        assert result["error"] is None

    def test_ask(self, m1):
        m1.learn("Backpropagation computes gradients.")
        answer = m1.ask("What is backpropagation?")
        assert isinstance(answer, str)

    def test_teach(self, m1):
        out = m1.teach("decorators")
        assert isinstance(out, str)

    def test_quiz(self, m1):
        out = m1.quiz("decorators", n=2)
        assert isinstance(out, str)

    def test_stats(self, m1):
        m1.learn("Some content")
        stats = m1.stats()
        assert "total_sessions" in stats

    def test_repr(self, m1):
        assert "M1" in repr(m1)

    def test_backwards_compat(self, engine, kg):
        from modules.m1_self_learner import SelfLearner
        sl = SelfLearner(engine, kg)
        result = sl.learn_from_text("test")
        assert "response" in result

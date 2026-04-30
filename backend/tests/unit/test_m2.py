# tests/unit/test_m2.py
import pytest


class TestPaperParser:
    def test_extract_sections_heuristic(self):
        from modules.m2_research_accel.paper_parser import PaperParser
        text = "INTRODUCTION\nThis paper studies...\n\nMETHODS\nWe used..."
        secs = PaperParser._extract_sections(text)
        assert isinstance(secs, list)

    def test_parse_text(self, engine):
        from modules.m2_research_accel.paper_parser import PaperParser
        parser = PaperParser(engine)
        paper  = parser.parse_text("Title: Test Paper\nAbstract: This is a test.", source="test")
        assert paper.source == "test"
        assert isinstance(paper.key_claims, list)

    def test_paper_short_summary(self, engine):
        from modules.m2_research_accel.paper_parser import PaperParser
        parser = PaperParser(engine)
        paper  = parser.parse_text("A paper about testing.", source="test")
        summary = paper.short_summary
        assert isinstance(summary, str)


class TestHypothesisGenerator:
    def test_generate(self, engine, kg_with_data):
        from modules.m2_research_accel.hypothesis_gen import HypothesisGenerator
        gen  = HypothesisGenerator(engine, kg_with_data)
        hyps = gen.generate("neural networks", n=2)
        assert isinstance(hyps, list)

    def test_format_all_empty(self, engine, kg):
        from modules.m2_research_accel.hypothesis_gen import HypothesisGenerator
        gen = HypothesisGenerator(engine, kg)
        out = gen.format_all([])
        assert "No hypotheses" in out


class TestConnectionFinder:
    def test_find_empty_kg(self, engine, kg):
        from modules.m2_research_accel.connection_finder import ConnectionFinder
        cf   = ConnectionFinder(engine, kg)
        conns = cf.find()
        assert conns == []

    def test_find_with_data(self, engine, kg_with_data):
        from modules.m2_research_accel.connection_finder import ConnectionFinder
        cf    = ConnectionFinder(engine, kg_with_data)
        conns = cf.find(n=2)
        assert isinstance(conns, list)


class TestRanker:
    def test_rank_texts(self, engine):
        from modules.m2_research_accel.ranker import Ranker
        ranker = Ranker(engine)
        texts  = ["Neural networks", "Python decorators", "Attention mechanism"]
        ranked = ranker.rank_texts(texts, "deep learning")
        assert isinstance(ranked, list)
        assert len(ranked) == len(texts)


class TestM2Facade:
    def test_hypotheses_returns_string(self, m2):
        out = m2.hypotheses("machine learning", n=2)
        assert isinstance(out, str)

    def test_connections_empty(self, m2):
        out = m2.connections()
        assert isinstance(out, str)

    def test_run(self, m2):
        out = m2.run("generate hypotheses about attention mechanisms")
        assert isinstance(out, str)

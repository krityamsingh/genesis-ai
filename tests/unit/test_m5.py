# tests/unit/test_m5.py


class TestBayesianReasoner:
    def test_update_belief(self, engine, kg):
        from modules.m5_intuition_engine.bayesian_reasoner import BayesianReasoner
        b      = BayesianReasoner(engine, kg)
        result = b.update_belief("Python is popular", prior=0.8)
        assert 0.0 <= result.posterior <= 1.0
        assert result.claim == "Python is popular"

    def test_probability_of(self, engine, kg):
        from modules.m5_intuition_engine.bayesian_reasoner import BayesianReasoner
        b = BayesianReasoner(engine, kg)
        p = b.probability_of("AI will pass the Turing test")
        assert 0.0 <= p <= 1.0


class TestGapFiller:
    def test_fill(self, engine, kg_with_data):
        from modules.m5_intuition_engine.gap_filler import GapFiller
        gf     = GapFiller(engine, kg_with_data)
        filled = gf.fill("quantum neural networks", store=False)
        assert filled.gap_description == "quantum neural networks"
        assert filled.confidence in ("high", "medium", "low", "speculative")


class TestCrossModuleGlue:
    def test_synthesise(self, engine, kg):
        from modules.m5_intuition_engine.cross_module_glue import CrossModuleGlue
        glue   = CrossModuleGlue(engine, kg)
        result = glue.synthesise({"m1": "Python facts", "m2": "ML research"})
        assert isinstance(result, str)

    def test_cross_kg_insight_empty(self, engine, kg):
        from modules.m5_intuition_engine.cross_module_glue import CrossModuleGlue
        glue   = CrossModuleGlue(engine, kg)
        result = glue.cross_kg_insight("anything")
        assert isinstance(result, str)


class TestM5Facade:
    def test_run_probability(self, m5):
        out = m5.run("what is the probability of AGI by 2030")
        assert isinstance(out, str)

    def test_explain(self, m5):
        out = m5.explain("backpropagation")
        assert isinstance(out, str)

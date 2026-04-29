# tests/unit/test_m3.py


class TestProblemParser:
    def test_parse(self, engine):
        from modules.m3_ai_builder.problem_parser import ProblemParser
        parser = ProblemParser(engine)
        spec   = parser.parse("Build an image classifier for cats vs dogs.")
        assert spec.raw_description
        assert isinstance(spec.inputs, list)
        assert isinstance(spec.outputs, list)

    def test_to_prompt(self, engine):
        from modules.m3_ai_builder.problem_parser import ProblemParser
        parser = ProblemParser(engine)
        spec   = parser.parse("Classify emails as spam or not.")
        prompt = spec.to_prompt()
        assert "Task:" in prompt


class TestArchDesigner:
    def test_design(self, engine):
        from modules.m3_ai_builder.problem_parser import ProblemParser
        from modules.m3_ai_builder.arch_designer  import ArchDesigner
        spec   = ProblemParser(engine).parse("Binary classification problem.")
        arch   = ArchDesigner(engine).design(spec)
        assert arch.model_name
        assert arch.framework
        assert isinstance(arch.layers, list)

    def test_summary(self, engine):
        from modules.m3_ai_builder.problem_parser import ProblemParser
        from modules.m3_ai_builder.arch_designer  import ArchDesigner
        spec = ProblemParser(engine).parse("Test problem")
        arch = ArchDesigner(engine).design(spec)
        assert "Architecture:" in arch.summary()


class TestM3Facade:
    def test_run(self, m3):
        out = m3.run("Build a spam classifier using email text features.")
        assert isinstance(out, str) and len(out) > 0

    def test_build(self, m3):
        result = m3.build("Classify customer reviews as positive or negative.")
        assert "spec" in result
        assert "arch" in result
        assert "code" in result

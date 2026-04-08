# tests/integration/test_integration.py
import pytest


class TestFullPipeline:
    """End-to-end integration tests — no network, no LLM token needed."""

    def test_learn_then_ask(self, engine, kg):
        from modules.m1_self_learner import M1
        m1 = M1(engine, kg)
        m1.learn("Transformers use self-attention to process sequences in parallel.")
        answer = m1.ask("What do transformers use?")
        assert isinstance(answer, str)

    def test_m1_to_m5_gap_fill(self, engine, kg):
        """M1 learns → M5 fills gaps in that knowledge."""
        from modules.m1_self_learner    import M1
        from modules.m5_intuition_engine import M5
        m1 = M1(engine, kg)
        m5 = M5(engine, kg)
        m1.learn("Neural networks learn representations from data.")
        gaps = m5.fill_gaps("neural network training")
        assert isinstance(gaps, list)

    def test_m1_to_m2_connections(self, engine, kg):
        """M1 stores knowledge → M2 finds connections."""
        from modules.m1_self_learner    import M1
        from modules.m2_research_accel  import M2
        m1 = M1(engine, kg)
        m2 = M2(engine, kg)
        m1.learn("Backpropagation computes gradients via the chain rule.")
        m1.learn("Gradient descent minimises loss functions iteratively.")
        out = m2.connections()
        assert isinstance(out, str)

    def test_router_dispatches_to_m1(self, engine, kg):
        from modules.m1_self_learner import M1
        from core.router             import Router
        m1 = M1(engine, kg)
        r  = Router(engine, default_module="m1")
        r.register("m1", m1.ask)
        result = r.route("explain gradient descent")
        assert result["module"] == "m1"
        assert isinstance(result["response"], str)

    def test_memory_persists_across_m1_calls(self, engine, kg):
        from modules.m1_self_learner import M1
        from core.memory_manager     import MemoryManager
        m1  = M1(engine, kg)
        mem = MemoryManager(kg)
        m1.learn("LSTM networks handle sequential data.")
        mem.add_user("Tell me about LSTMs")
        mem.add_assistant(m1.ask("What are LSTMs?"))
        mem.save_to_kg("test_session")
        assert mem.stats()["total_turns"] == 2

    def test_kg_shared_between_modules(self, engine, kg):
        """All modules sharing the same KG see each other's data."""
        from modules.m1_self_learner    import M1
        from modules.m5_intuition_engine import M5
        m1 = M1(engine, kg)
        m5 = M5(engine, kg)
        m1.learn("Reinforcement learning agents learn from rewards.")
        insight = m5.cross_insight("reinforcement learning")
        assert isinstance(insight, str)

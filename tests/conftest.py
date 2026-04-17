# tests/conftest.py — shared pytest fixtures
import os
import pytest
from unittest.mock import MagicMock, patch

# ── Fix #7: Set JWT_SECRET before any security.* import ──────────────────────
# security/jwt_handler.py raises RuntimeError at module import time if
# JWT_SECRET is not in the environment. Any test that touches auth_routes,
# permissions, jwt_handler, or anything that imports from security.* will
# crash immediately without this. Set a deterministic test-only secret FIRST,
# before any of those imports happen.
os.environ.setdefault("JWT_SECRET", "test-only-secret-do-not-use-in-production-32x")


# ── Fake GemmaEngine ──────────────────────────────────────────────────────────
class FakeEngine:
    """GemmaEngine drop-in for tests — no HF token, no network."""
    model_id = "fake/gemma-test"
    client   = MagicMock()

    def think(self, prompt, system_prompt=None, temperature=0.7,
              max_tokens=1024, model=None) -> str:
        return f"[FAKE RESPONSE] {prompt[:60]}"

    def think_json(self, prompt, schema_hint="", system_prompt=None,
                   temperature=0.2, max_tokens=1500) -> str:
        # Return minimal valid JSON for common schemas
        if "skills" in prompt or "domain" in prompt:
            return (
                '{"domain":"test","difficulty":"beginner",'
                '"main_topics":["topic1"],"key_facts":["fact1"],'
                '"skills":[{"name":"Test Skill","level":"beginner",'
                '"domain":"test","description":"A test skill",'
                '"prerequisites":[],"related":[]}],'
                '"concepts":[{"name":"Test Concept","definition":"A concept",'
                '"domain":"test","examples":[],"key_terms":[]}],'
                '"summary":"Test summary."}'
            )
        if "posterior" in prompt:
            return '{"posterior":0.7,"evidence_used":[],"reasoning":"test","confidence":"medium"}'
        if "model_name" in prompt:
            return ('{"model_name":"TestNet","framework":"PyTorch","layers":[],'
                    '"training_strategy":"Adam lr=1e-4","estimated_params":"1M",'
                    '"rationale":"test","code_skeleton":"class Model: pass"}')
        return '{"result": "fake"}'

    def think_stream(self, prompt, **kwargs):
        yield "[FAKE STREAM] "
        yield prompt[:30]

    def think_batch(self, prompts, **kwargs):
        return [self.think(p) for p in prompts]

    def code(self, problem, language="python", **kwargs) -> str:
        return f"# Fake {language} code\ndef solution(): pass"

    def see(self, image_source, question, **kwargs) -> str:
        return "ERA: 2020s | OBJECTS: computer | CLUES: modern tech | DESCRIPTION: a photo"

    def switch_model(self, model): pass

    def __repr__(self): return "<FakeEngine>"


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture
def engine():
    return FakeEngine()


@pytest.fixture
def kg():
    from core.knowledge_graph import KnowledgeGraph
    _kg = KnowledgeGraph()       # in-memory TF-IDF (no chromadb needed)
    yield _kg
    _kg.reset_all()


@pytest.fixture
def kg_with_data(kg):
    """KG pre-loaded with sample knowledge."""
    kg.store("knowledge", "Python decorators are a design pattern.",
             metadata={"domain": "programming"})
    kg.store("knowledge", "Neural networks learn from data using backpropagation.",
             metadata={"domain": "ml"})
    kg.store("knowledge", "The Transformer architecture uses self-attention.",
             metadata={"domain": "ml"})
    return kg


@pytest.fixture
def m1(engine, kg):
    from modules.m1_self_learner import M1
    return M1(engine, kg)


@pytest.fixture
def m2(engine, kg):
    from modules.m2_research_accel import M2
    return M2(engine, kg)


@pytest.fixture
def m3(engine, kg):
    from modules.m3_ai_builder import M3
    return M3(engine, kg)


@pytest.fixture
def m4(engine, kg):
    from modules.m4_time_reconstruct import M4
    return M4(engine, kg)


@pytest.fixture
def m5(engine, kg):
    from modules.m5_intuition_engine import M5
    return M5(engine, kg)


@pytest.fixture
def m6(engine, kg):
    from modules.m6_reality_sim import M6
    return M6(engine, kg)


@pytest.fixture
def memory(kg):
    from core.memory_manager import MemoryManager
    return MemoryManager(kg, session_id="test-session")


@pytest.fixture
def router(engine):
    from core.router import Router
    r = Router(engine, default_module="m1")
    r.register("m1", lambda q: f"m1 handled: {q}")
    r.register("m2", lambda q: f"m2 handled: {q}")
    return r

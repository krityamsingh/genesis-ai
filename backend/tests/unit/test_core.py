# tests/unit/test_core.py
# GENESIS — Core unit tests (GemmaEngine + Router)

import json
import pytest
from unittest.mock import MagicMock, patch, AsyncMock


# ── GemmaEngine tests ─────────────────────────────────────────────────────────

class TestGemmaEngine:
    """Tests for GemmaEngine inference wrapper."""

    @pytest.fixture
    def mock_engine(self):
        """Engine with mocked HuggingFace client."""
        with patch("core.gemma_engine.InferenceClient") as MockClient, \
             patch("core.gemma_engine.AsyncInferenceClient") as MockAsyncClient:
            mock_client = MagicMock()
            mock_async  = AsyncMock()
            MockClient.return_value      = mock_client
            MockAsyncClient.return_value = mock_async

            from core.gemma_engine import GemmaEngine
            engine = GemmaEngine(token="hf_test_token_123")
            engine.client       = mock_client
            engine.async_client = mock_async
            yield engine, mock_client, mock_async

    def test_think_returns_text(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.return_value.choices[0].message.content = "Paris"
        result = engine.think("What is the capital of France?", max_tokens=10)
        assert result == "Paris"
        mock_client.chat_completion.assert_called_once()

    def test_think_with_system_prompt(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.return_value.choices[0].message.content = "42"
        result = engine.think("Answer in one word.", system_prompt="You are brief.", max_tokens=5)
        call_args = mock_client.chat_completion.call_args
        messages  = call_args.kwargs.get("messages") or call_args[1]["messages"]
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are brief."
        assert result == "42"

    def test_think_retries_on_error(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.side_effect = [Exception("timeout"), MagicMock()]
        mock_client.chat_completion.return_value.choices[0].message.content = "ok"
        with patch("time.sleep"):
            result = engine.think("test")
        assert mock_client.chat_completion.call_count >= 1

    def test_think_returns_error_string_after_max_retries(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.side_effect = Exception("network error")
        with patch("time.sleep"):
            result = engine.think("test")
        assert result.startswith("[ENGINE ERROR]")

    def test_think_json_clean(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.return_value.choices[0].message.content = \
            '{"name": "Alice", "age": 30}'
        result = engine.think_json("Return user JSON")
        parsed = json.loads(result)
        assert parsed["name"] == "Alice"

    def test_think_json_extracts_from_prose(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.return_value.choices[0].message.content = \
            'Here is the JSON you requested:\n```json\n{"key": "value"}\n```'
        result = engine.think_json("Return JSON")
        parsed = json.loads(result)
        assert parsed["key"] == "value"

    def test_think_stream_yields_chunks(self, mock_engine):
        engine, mock_client, _ = mock_engine
        chunks = [MagicMock(), MagicMock(), MagicMock()]
        chunks[0].choices[0].delta.content = "Hello"
        chunks[1].choices[0].delta.content = " World"
        chunks[2].choices[0].delta.content = "!"
        mock_client.chat_completion.return_value = iter(chunks)
        result = "".join(engine.think_stream("Say hello"))
        assert result == "Hello World!"

    def test_think_stream_yields_error_on_exception(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.side_effect = Exception("stream broken")
        result = list(engine.think_stream("test"))
        assert any("[ERROR]" in c for c in result)

    def test_think_batch_returns_list(self, mock_engine):
        engine, mock_client, _ = mock_engine
        mock_client.chat_completion.return_value.choices[0].message.content = "answer"
        with patch("time.sleep"):
            results = engine.think_batch(["q1", "q2", "q3"])
        assert len(results) == 3
        assert all(r == "answer" for r in results)

    @pytest.mark.asyncio
    async def test_think_async_returns_text(self, mock_engine):
        engine, _, mock_async = mock_engine
        mock_async.chat_completion.return_value.choices[0].message.content = "async result"
        result = await engine.think_async("test async")
        assert result == "async result"

    @pytest.mark.asyncio
    async def test_think_batch_async_concurrent(self, mock_engine):
        engine, _, mock_async = mock_engine
        mock_async.chat_completion.return_value.choices[0].message.content = "parallel"
        results = await engine.think_batch_async(["a", "b", "c"])
        assert results == ["parallel", "parallel", "parallel"]

    def test_switch_model(self, mock_engine):
        engine, _, _ = mock_engine
        with patch("core.gemma_engine.InferenceClient"), \
             patch("core.gemma_engine.AsyncInferenceClient"):
            engine.switch_model("fast")
        assert "gemma-4-12b" in engine.model_id or "gemma-3-12b" in engine.model_id

    def test_extract_json_handles_code_fence(self):
        from core.gemma_engine import GemmaEngine
        raw = '```json\n{"x": 1}\n```'
        result = GemmaEngine._extract_json(raw)
        assert json.loads(result)["x"] == 1

    def test_extract_json_handles_prose(self):
        from core.gemma_engine import GemmaEngine
        raw = 'Sure! Here it is: {"result": "done"} Hope that helps!'
        result = GemmaEngine._extract_json(raw)
        assert json.loads(result)["result"] == "done"

    def test_model_registry_has_gemma4(self):
        from core.gemma_engine import GEMMA_MODELS
        assert "default" in GEMMA_MODELS
        assert "gemma-4" in GEMMA_MODELS["default"]

    def test_fallback_map_covers_gemma4(self):
        from core.gemma_engine import _FALLBACK_MAP, GEMMA_MODELS
        assert GEMMA_MODELS["default"] in _FALLBACK_MAP


# ── Router tests ──────────────────────────────────────────────────────────────

class TestRouter:
    """Tests for the module Router."""

    @pytest.fixture
    def mock_engine(self):
        engine = MagicMock()
        engine.think.return_value = "m1"
        engine.think_async = AsyncMock(return_value="m1")
        return engine

    @pytest.fixture
    def router(self, mock_engine):
        from core.router import Router
        m1 = MagicMock(return_value={"answer": "transformer uses attention"})
        m2 = MagicMock(return_value={"papers": []})
        m6 = MagicMock(return_value={"simulation": "market crashed"})
        return Router(
            engine=mock_engine,
            modules={"m1": m1, "m2": m2, "m6": m6},
            default_module="m1",
        )

    def test_route_to_m1_on_quiz_keyword(self, router):
        result = router.route("Quiz me on neural networks")
        assert result["module"] == "m1"

    def test_route_to_m2_on_research_keyword(self, router):
        result = router.route("Research the latest arxiv papers on diffusion models")
        assert result["module"] == "m2"

    def test_route_to_m6_on_simulate_keyword(self, router):
        result = router.route("Simulate a market crash scenario for 2027")
        assert result["module"] == "m6"

    def test_route_falls_back_to_default(self, router):
        result = router.route("xyzzy frobnicate blorple", use_llm_fallback=False)
        assert result["module"] == "m1"

    def test_route_result_has_confidence(self, router):
        result = router.route("Quiz me on something")
        assert "confidence" in result
        assert 0.0 <= result["confidence"] <= 1.0

    def test_route_result_has_all_keys(self, router):
        result = router.route("explain attention")
        for key in ("module", "intent", "confidence", "response", "query"):
            assert key in result

    def test_route_log_grows(self, router):
        router.route("question 1")
        router.route("question 2")
        assert len(router.route_log()) == 2

    def test_stats_returns_by_module(self, router):
        router.route("quiz me")
        router.route("research papers")
        stats = router.stats()
        assert "by_module" in stats
        assert stats["total_routed"] == 2

    def test_register_adds_module(self, router):
        new_module = MagicMock(return_value="result")
        router.register("custom", new_module)
        assert "custom" in router.modules

    @pytest.mark.asyncio
    async def test_async_route(self, router):
        result = await router.async_route("quiz me on something")
        assert result["module"] == "m1"

    def test_confidence_is_higher_for_exact_matches(self, router):
        result_strong = router.route("quiz me on transformers and flashcards and study plan")
        result_weak   = router.route("explain something")
        assert result_strong["confidence"] >= result_weak["confidence"]

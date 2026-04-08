# tests/unit/test_core.py
import pytest


class TestKnowledgeGraph:
    def test_store_and_search(self, kg):
        kg.store("knowledge", "Python is a programming language.", metadata={"domain": "cs"})
        results = kg.search("knowledge", "Python programming")
        assert len(results) > 0
        assert "Python" in results[0]

    def test_store_returns_id(self, kg):
        doc_id = kg.store("knowledge", "Test document")
        assert doc_id and len(doc_id) > 0

    def test_upsert_same_id(self, kg):
        kg.store("knowledge", "Version 1", doc_id="test_doc")
        kg.store("knowledge", "Version 2", doc_id="test_doc")
        assert kg.count("knowledge") == 1

    def test_delete(self, kg):
        doc_id = kg.store("knowledge", "Delete me", doc_id="to_delete")
        kg.delete("knowledge", doc_id)
        results = kg.search("knowledge", "Delete me")
        assert not any("Delete me" in r for r in results)

    def test_count(self, kg):
        assert kg.count("knowledge") == 0
        kg.store("knowledge", "Item 1")
        kg.store("knowledge", "Item 2")
        assert kg.count("knowledge") == 2

    def test_reset(self, kg_with_data):
        assert kg_with_data.count("knowledge") > 0
        kg_with_data.reset("knowledge")
        assert kg_with_data.count("knowledge") == 0

    def test_stats(self, kg_with_data):
        stats = kg_with_data.stats()
        assert "backend" in stats
        assert "total_docs" in stats
        assert stats["total_docs"] > 0

    def test_empty_search(self, kg):
        results = kg.search("knowledge", "nothing here")
        assert isinstance(results, list)

    def test_make_id_stable(self, kg):
        id1 = kg._make_id("same text")
        id2 = kg._make_id("same text")
        assert id1 == id2


class TestMemoryManager:
    def test_add_and_get_context(self, memory):
        memory.add_user("Hello")
        memory.add_assistant("Hi there!")
        ctx = memory.get_context()
        assert "Hello" in ctx
        assert "Hi there!" in ctx

    def test_ring_buffer(self):
        from core.knowledge_graph import KnowledgeGraph
        from core.memory_manager  import MemoryManager
        kg  = KnowledgeGraph()
        mem = MemoryManager(kg, max_turns=3)
        for i in range(5):
            mem.add_user(f"message {i}")
        assert len(mem._buffer) == 3
        assert "message 4" in mem._buffer[-1].content

    def test_get_context_as_list(self, memory):
        memory.add_user("Q")
        ctx = memory.get_context(as_list=True)
        assert isinstance(ctx, list)
        assert ctx[0]["role"] == "user"

    def test_save_and_search(self, memory, kg):
        memory.add_user("Test memory save")
        memory.save_to_kg("test_label")
        results = memory.search_memory("Test memory")
        assert len(results) > 0

    def test_last_messages(self, memory):
        memory.add_user("user message")
        memory.add_assistant("assistant reply")
        assert memory.last_user_message() == "user message"
        assert memory.last_assistant_message() == "assistant reply"

    def test_clear(self, memory):
        memory.add_user("msg")
        memory.clear()
        assert len(memory._buffer) == 0

    def test_stats(self, memory):
        stats = memory.stats()
        assert "session_id" in stats
        assert "buffer_turns" in stats


class TestRouter:
    def test_keyword_routing_m1(self, router):
        result = router.route("explain Python decorators")
        assert result["module"] == "m1"

    def test_keyword_routing_m2(self, router):
        result = router.route("research this paper on attention")
        assert result["module"] == "m2"

    def test_default_fallback(self, router):
        result = router.route("something completely unrecognised xyz123")
        assert result["module"] in ("m1", "m2")  # default or llm

    def test_route_returns_response(self, router):
        result = router.route("learn this content")
        assert "response" in result
        assert "module" in result
        assert "intent" in result

    def test_stats(self, router):
        router.route("explain something")
        stats = router.stats()
        assert stats["total_routed"] >= 1

    def test_register_module(self, router):
        router.register("m6", lambda q: "sim result")
        result = router.route("simulate a market crash")
        assert result["module"] in ("m6", "m1")


class TestVoiceInterface:
    def test_available_backends(self):
        from core.voice_interface import VoiceInterface
        v = VoiceInterface()
        backends = v.available_backends()
        assert "tts_backend" in backends

    def test_speak_no_backend(self):
        from core.voice_interface import VoiceInterface
        v = VoiceInterface()
        # Should return None gracefully if no TTS backend
        result = v.speak("")
        assert result is None

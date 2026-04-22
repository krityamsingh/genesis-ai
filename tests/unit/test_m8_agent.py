"""Unit tests for M8 Agent Runner."""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch

from modules.m8_agent_runner.tools import Tool, ToolRegistry, built_in_tools
from modules.m8_agent_runner.memory import AgentMemory


class TestToolRegistry:
    def setup_method(self):
        self.registry = ToolRegistry()

    def test_register_tool(self):
        async def my_fn(x, ctx=None): return "ok"
        tool = Tool("test_tool", "A test tool", my_fn)
        self.registry.register(tool)
        assert self.registry.get("test_tool") is not None

    def test_get_nonexistent(self):
        assert self.registry.get("nonexistent") is None

    def test_list_tools(self):
        self.registry.register_many(built_in_tools())
        tools = self.registry.list_tools()
        names = [t["name"] for t in tools]
        assert "think" in names
        assert "web_search" in names
        assert "code_exec" in names

    @pytest.mark.asyncio
    async def test_tool_run(self):
        async def greet(name, ctx=None): return f"Hello, {name}!"
        tool = Tool("greet", "Greets a person", greet)
        result = await tool.run("Alice")
        assert result == "Hello, Alice!"

    @pytest.mark.asyncio
    async def test_think_tool(self):
        tools = {t.name: t for t in built_in_tools()}
        result = await tools["think"].run("2 + 2 = 4")
        assert "Reasoning" in result

    @pytest.mark.asyncio
    async def test_code_exec_tool(self):
        tools = {t.name: t for t in built_in_tools()}
        result = await tools["code_exec"].run("print('genesis')")
        assert "genesis" in result


class TestAgentMemory:
    def test_new_session(self):
        mem = AgentMemory()
        session = mem.new_session("Test goal")
        assert session["goal"] == "Test goal"
        assert "id" in session

    def test_add_event(self):
        mem = AgentMemory()
        session = mem.new_session("Goal")
        mem.add(session, "step", {"tool": "think", "output": "done"})
        assert len(session["history"]) == 1

    def test_summarize(self):
        mem = AgentMemory()
        session = mem.new_session("Research AI")
        mem.add(session, "step", {"tool": "web_search", "input": "AI news", "output": "Found articles"})
        summary = mem.summarize(session)
        assert "Research AI" in summary
        assert "web_search" in summary

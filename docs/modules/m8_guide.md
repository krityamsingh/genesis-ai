# M8 Agent Runner — Developer Guide

## Overview
M8 implements an autonomous AI agent that decomposes complex goals into ordered
tool-use steps, executes them with timeout protection, and synthesizes a final result.

## How it Works

```
User Goal
    │
    ▼
TaskPlanner.decompose()     — LLM generates a JSON plan of tool-use steps
    │
    ▼
AgentRunner execution loop  — for each step:
    ├── Look up tool in ToolRegistry
    ├── Execute with asyncio timeout
    ├── Store result in AgentMemory
    └── Yield SSE event to client
    │
    ▼
TaskPlanner.synthesize()    — LLM writes final report from all step results
    │
    ▼
{"type": "done", "result": "...", "elapsed": 4.2}
```

## Built-in Tools

| Tool | Purpose |
|------|---------|
| `think` | Pure chain-of-thought reasoning |
| `web_search` | Search the web for current info |
| `summarize` | Condense long text |
| `write` | Generate written content |
| `retrieve` | Query ChromaDB knowledge base |
| `code_exec` | Execute Python safely |

## Adding Custom Tools

```python
from modules.m8_agent_runner import AgentRunner, ToolRegistry
from modules.m8_agent_runner.tools import Tool

async def my_tool(input_str: str, ctx=None) -> str:
    return f"Result for: {input_str}"

runner = AgentRunner()
runner.registry.register(Tool("my_tool", "Does something useful", my_tool))
```

## API Usage

### Streaming (SSE)
```http
POST /api/v1/agent/run
Authorization: Bearer <token>
Content-Type: application/json

{
  "goal": "Research quantum computing papers from 2024 and write a summary",
  "context": "Focus on error correction breakthroughs",
  "stream": true
}
```

SSE events:
```
data: {"type": "plan", "steps": [{"tool": "web_search", ...}, ...]}
data: {"type": "think", "reasoning": "I should first search for..."}
data: {"type": "step", "n": 1, "tool": "web_search", "input": "quantum...", "output": "..."}
data: {"type": "done", "result": "## Quantum Computing Summary...", "elapsed": 8.3}
data: [DONE]
```

### Non-streaming
```http
POST /api/v1/agent/run
{
  "goal": "...",
  "stream": false
}
```
Returns: `{"events": [...], "goal": "..."}`

## Configuration

```env
AGENT_MAX_STEPS=12        # Maximum tool-use iterations
AGENT_STEP_TIMEOUT=30     # Seconds per tool execution
LLM_PROVIDER=google       # Planner LLM provider
```

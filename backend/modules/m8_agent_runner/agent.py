"""
M8 AgentRunner — Orchestrates multi-step autonomous task execution.

Architecture:
    User Goal → Planner (decompose) → Tool Executor (loop) → Synthesizer (report)

The agent iterates up to MAX_STEPS, choosing tools from the registry each step,
accumulating results, and detecting completion or failure.
"""
from __future__ import annotations
import asyncio, logging, os, time
from typing import Any, AsyncIterator, Dict, List, Optional

from .planner   import TaskPlanner
from .tools     import ToolRegistry, built_in_tools
from .memory    import AgentMemory

log = logging.getLogger("m8.agent")
MAX_STEPS   = int(os.getenv("AGENT_MAX_STEPS", "12"))
STEP_TIMEOUT = int(os.getenv("AGENT_STEP_TIMEOUT", "30"))


class AgentRunner:
    """
    Autonomous agent runner.

    Usage:
        runner = AgentRunner()
        async for event in runner.run("Research the latest papers on RAG"):
            print(event)
    """

    def __init__(self, config: Optional[Dict] = None):
        self.config   = config or {}
        self.planner  = TaskPlanner(config)
        self.registry = ToolRegistry()
        self.registry.register_many(built_in_tools())
        self.memory   = AgentMemory()
        log.info("M8 AgentRunner initialized | max_steps=%d", MAX_STEPS)

    async def run(
        self,
        goal: str,
        context: Optional[str] = None,
        streaming: bool = False,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Yield step events as the agent works toward `goal`.

        Event shapes:
          {"type": "plan",   "steps": [...]}
          {"type": "step",   "n": int, "tool": str, "input": str, "output": str}
          {"type": "think",  "reasoning": str}
          {"type": "done",   "result": str, "steps_taken": int, "elapsed": float}
          {"type": "error",  "message": str}
        """
        t0 = time.monotonic()
        session = self.memory.new_session(goal)

        # 1. Plan
        try:
            plan = await self.planner.decompose(goal, context)
            yield {"type": "plan", "steps": plan}
            log.info("Agent plan: %d steps", len(plan))
        except Exception as e:
            yield {"type": "error", "message": f"Planning failed: {e}"}
            return

        # 2. Execute loop
        results: List[str] = []
        for i, task in enumerate(plan[:MAX_STEPS], start=1):
            tool_name = task.get("tool", "think")
            tool_input = task.get("input", "")
            reasoning  = task.get("reasoning", "")

            if reasoning:
                yield {"type": "think", "reasoning": reasoning}

            # Execute tool
            tool = self.registry.get(tool_name)
            if not tool:
                log.warning("Unknown tool: %s — skipping", tool_name)
                continue

            try:
                output = await asyncio.wait_for(
                    tool.run(tool_input, session_context=session),
                    timeout=STEP_TIMEOUT,
                )
                results.append(f"[Step {i} — {tool_name}]\n{output}")
                self.memory.add(session, "step", {"tool": tool_name, "input": tool_input, "output": output})
                yield {"type": "step", "n": i, "tool": tool_name, "input": tool_input, "output": output}

                # Early exit if planner signals completion
                if task.get("terminal", False):
                    break

            except asyncio.TimeoutError:
                yield {"type": "step", "n": i, "tool": tool_name, "input": tool_input, "output": "⚠ Timeout"}
            except Exception as e:
                log.error("Tool %s failed: %s", tool_name, e)
                yield {"type": "step", "n": i, "tool": tool_name, "input": tool_input, "output": f"Error: {e}"}

        # 3. Synthesize final result
        try:
            final = await self.planner.synthesize(goal, results)
        except Exception:
            final = "\n\n".join(results) if results else "No results collected."

        elapsed = time.monotonic() - t0
        yield {"type": "done", "result": final, "steps_taken": len(results), "elapsed": round(elapsed, 2)}

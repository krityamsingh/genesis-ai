"""M8 TaskPlanner — Decomposes a goal into ordered tool-use steps using an LLM."""
from __future__ import annotations
import json, logging, os
from typing import Any, Dict, List, Optional

log = logging.getLogger("m8.planner")

PLAN_SYSTEM = """You are an autonomous task planner. Given a user goal, decompose it into
a series of tool-use steps. Available tools: web_search, code_exec, summarize, think, retrieve, write.

Respond ONLY with a valid JSON array. Each element:
{
  "tool":      "<tool_name>",
  "input":     "<what to pass to the tool>",
  "reasoning": "<why this step>",
  "terminal":  false
}
Set "terminal": true on the LAST meaningful step."""

SYNTH_SYSTEM = """You are a results synthesizer. Given a goal and a list of step results,
write a clear, well-structured final answer. Be concise but complete."""


class TaskPlanner:
    def __init__(self, config: Optional[Dict] = None):
        self.config   = config or {}
        self.provider = os.getenv("LLM_PROVIDER", "google")

    async def decompose(self, goal: str, context: Optional[str] = None) -> List[Dict[str, Any]]:
        prompt = f"Goal: {goal}"
        if context:
            prompt += f"\n\nContext:\n{context}"

        raw = await self._complete(PLAN_SYSTEM, prompt)

        try:
            # Strip markdown fences
            raw = raw.strip().strip("```json").strip("```").strip()
            return json.loads(raw)
        except json.JSONDecodeError:
            log.warning("Planner returned non-JSON; using single think step")
            return [{"tool": "think", "input": goal, "reasoning": "Direct reasoning", "terminal": True}]

    async def synthesize(self, goal: str, step_results: List[str]) -> str:
        context = "\n\n".join(step_results)
        prompt  = f"Goal: {goal}\n\nStep Results:\n{context}"
        return await self._complete(SYNTH_SYSTEM, prompt)

    async def _complete(self, system: str, prompt: str) -> str:
        if self.provider == "google":
            try:
                import google.generativeai as genai
                genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
                model = genai.GenerativeModel(
                    "gemini-2.0-flash",
                    system_instruction=system,
                )
                resp = model.generate_content(prompt)
                return resp.text or ""
            except Exception as e:
                log.error("Google planner error: %s", e)

        if self.provider == "openai":
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                    max_tokens=1024,
                )
                return resp.choices[0].message.content or ""
            except Exception as e:
                log.error("OpenAI planner error: %s", e)

        return json.dumps([{"tool": "think", "input": prompt, "reasoning": "Fallback", "terminal": True}])

from core.plugins.registry import Plugin
import logging
log = logging.getLogger("plugins.web_search")
async def run(query: str) -> str:
    log.info(f"web_search: {query[:80]}")
    return f"[web_search] Results for: {query}"
PLUGIN = Plugin(name="web_search", description="Search the web", run=run, permissions=["internet"])

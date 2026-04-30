from core.plugins.registry import Plugin
def run(expr: str) -> str:
    try: return str(eval(expr, {"__builtins__": {}}, {}))
    except Exception as e: return f"[calculator] Error: {e}"
PLUGIN = Plugin(name="calculator", description="Evaluate math expressions", run=run)

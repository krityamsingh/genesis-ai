"""M9 Sandbox — Isolated execution environment with timeout and output capture."""
from __future__ import annotations
import asyncio, io, sys, contextlib, logging
from typing import Any, Callable, Dict

log = logging.getLogger("m9.sandbox")


class Sandbox:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    async def run(self, runner: Callable, code: str, variables: Dict[str, Any]) -> Dict:
        """Run a language runner inside a sandbox with timeout."""
        try:
            return await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, runner, code, variables),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError:
            return {"stdout": "", "stderr": "", "result": None, "error": f"Execution timed out after {self.timeout}s", "charts": [], "tables": []}
        except Exception as e:
            return {"stdout": "", "stderr": "", "result": None, "error": str(e), "charts": [], "tables": []}


def python_runner(code: str, variables: Dict[str, Any]) -> Dict:
    """Execute Python code with captured stdout/stderr."""
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    namespace  = {**variables}
    result_val = None

    # Capture print output
    import builtins
    captured: list = []
    original_print = builtins.print
    def captured_print(*args, **kwargs):
        sep = kwargs.get("sep", " ")
        end = kwargs.get("end", "\n")
        captured.append(sep.join(str(a) for a in args) + end)
    builtins.print = captured_print

    error = None
    try:
        tree = compile(code, "<genesis-interpreter>", "exec")
        exec(tree, namespace)  # noqa: S102
        # Try to get the last expression value
        lines = [l.strip() for l in code.strip().splitlines() if l.strip()]
        if lines:
            try:
                result_val = eval(compile(lines[-1], "<result>", "eval"), namespace)  # noqa: S307
            except Exception:
                result_val = None
    except Exception as e:
        error = f"{type(e).__name__}: {e}"
    finally:
        builtins.print = original_print

    stdout = "".join(captured)
    return {
        "stdout": stdout,
        "stderr": "",
        "result": None if result_val is None else str(result_val),
        "error": error,
        "charts": [],
        "tables": [],
    }


def bash_runner(code: str, variables: Dict[str, Any]) -> Dict:
    """Execute Bash commands (subprocess)."""
    import subprocess, shlex
    try:
        proc = subprocess.run(
            code, shell=True, capture_output=True, text=True, timeout=8,  # noqa: S602
        )
        return {"stdout": proc.stdout, "stderr": proc.stderr, "result": None,
                "error": proc.stderr if proc.returncode != 0 else None,
                "charts": [], "tables": []}
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "", "result": None, "error": "Bash timeout", "charts": [], "tables": []}
    except Exception as e:
        return {"stdout": "", "stderr": "", "result": None, "error": str(e), "charts": [], "tables": []}


def sql_runner(code: str, variables: Dict[str, Any]) -> Dict:
    """Execute SQL against an in-memory SQLite database."""
    import sqlite3
    db_path = variables.get("db_path", ":memory:")
    try:
        conn = sqlite3.connect(db_path)
        cur  = conn.cursor()
        statements = [s.strip() for s in code.split(";") if s.strip()]
        output_lines = []
        for stmt in statements:
            cur.execute(stmt)
            if cur.description:
                headers = [d[0] for d in cur.description]
                rows    = cur.fetchall()
                output_lines.append(" | ".join(headers))
                output_lines.append("-" * 40)
                for row in rows[:50]:
                    output_lines.append(" | ".join(str(c) for c in row))
        conn.commit(); conn.close()
        return {"stdout": "\n".join(output_lines), "stderr": "", "result": None,
                "error": None, "charts": [], "tables": []}
    except Exception as e:
        return {"stdout": "", "stderr": "", "result": None,
                "error": f"SQL error: {e}", "charts": [], "tables": []}

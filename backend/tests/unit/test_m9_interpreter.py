"""Unit tests for M9 Code Interpreter."""
import pytest
from modules.m9_code_interpreter.sandbox import python_runner, bash_runner, sql_runner
from modules.m9_code_interpreter.languages import LanguageRegistry


class TestPythonRunner:
    def test_print_output(self):
        result = python_runner("print('hello world')", {})
        assert result["stdout"].strip() == "hello world"
        assert result["error"] is None

    def test_math(self):
        result = python_runner("print(2 ** 10)", {})
        assert "1024" in result["stdout"]

    def test_syntax_error(self):
        result = python_runner("def broken(: pass", {})
        assert result["error"] is not None

    def test_runtime_error(self):
        result = python_runner("1 / 0", {})
        assert result["error"] is not None
        assert "ZeroDivision" in result["error"]

    def test_multiple_prints(self):
        result = python_runner("for i in range(3):\n    print(i)", {})
        assert "0" in result["stdout"]
        assert "1" in result["stdout"]
        assert "2" in result["stdout"]

    def test_variables_injected(self):
        result = python_runner("print(x + 1)", {"x": 41})
        # x is in namespace
        assert result["stdout"].strip() == "42" or result["error"] is None


class TestSQLRunner:
    def test_select(self):
        code = "CREATE TABLE t(id INT, v TEXT); INSERT INTO t VALUES(1,'a'); SELECT * FROM t;"
        result = sql_runner(code, {})
        assert result["error"] is None
        assert "a" in result["stdout"]

    def test_bad_sql(self):
        result = sql_runner("SELECT * FROM nonexistent_table;", {})
        assert result["error"] is not None


class TestLanguageRegistry:
    def setup_method(self):
        self.reg = LanguageRegistry()

    def test_python_aliases(self):
        for alias in ("python", "py", "python3"):
            assert self.reg.get(alias) is not None

    def test_sql_aliases(self):
        for alias in ("sql", "sqlite"):
            assert self.reg.get(alias) is not None

    def test_bash_aliases(self):
        for alias in ("bash", "sh", "shell"):
            assert self.reg.get(alias) is not None

    def test_unknown_language(self):
        assert self.reg.get("cobol") is None

    def test_list_languages(self):
        langs = self.reg.list_languages()
        assert "python" in langs
        assert "sql" in langs

    def test_custom_register(self):
        def my_runner(code, vars): return {"stdout": "custom", "stderr": "", "result": None, "error": None, "charts": [], "tables": []}
        self.reg.register("myscript", my_runner)
        assert self.reg.get("myscript") is not None

# M9 Code Interpreter — Developer Guide

## Overview
M9 provides sandboxed code execution for Python, Bash, and SQL. Each execution
runs in an isolated namespace with stdout capture and a configurable timeout.

## Supported Languages

| Language | Aliases | Notes |
|----------|---------|-------|
| Python | `python`, `py`, `python3` | Full stdlib, print capture |
| Bash | `bash`, `sh`, `shell` | subprocess with timeout |
| SQL | `sql`, `sqlite` | In-memory SQLite by default |

## API Usage

```http
POST /api/v1/interpret/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "for i in range(5):\n    print(i ** 2)",
  "language": "python",
  "variables": {}
}
```

Response:
```json
{
  "language": "python",
  "stdout": "0\n1\n4\n9\n16\n",
  "stderr": "",
  "result": null,
  "error": null,
  "elapsed": 0.003,
  "charts": [],
  "tables": []
}
```

## SQL Example

```json
{
  "code": "CREATE TABLE t (id INT, name TEXT); INSERT INTO t VALUES (1, 'Alice'); SELECT * FROM t;",
  "language": "sql"
}
```

Response stdout:
```
id | name
----------------------------------------
1  | Alice
```

## Python SDK

```python
from modules.m9_code_interpreter import CodeInterpreter

interp = CodeInterpreter()

# Execute Python
result = await interp.execute("""
import math
for i in range(1, 6):
    print(f"{i}! = {math.factorial(i)}")
""", "python")

print(result["stdout"])
# 1! = 1
# 2! = 2
# 3! = 6
# 4! = 24
# 5! = 120

# Execute SQL
result = await interp.execute(
    "SELECT 1+1 AS sum, 'hello' AS greeting;",
    "sql"
)
print(result["stdout"])
```

## Security Notes

- Python runs in a restricted exec namespace (no file system access by default)
- Bash runs in a subprocess with a 8-second timeout
- SQL uses an in-memory SQLite database (no persistent writes unless `db_path` variable set)
- All executions have a configurable `CODE_EXEC_TIMEOUT` (default: 10s)

## Configuration

```env
CODE_EXEC_TIMEOUT=10          # Seconds per execution
CODE_EXEC_MAX_OUTPUT=50000    # Max bytes in stdout
```

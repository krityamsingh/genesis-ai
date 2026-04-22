# M3 — AI Builder Module

M3 transforms problem descriptions into working code: it parses requirements,
designs ML architectures, generates deployment-ready code, and produces
infrastructure configs.

## Capabilities

| Method | Description |
|---|---|
| `parse_problem(description)` | Extract structured requirements |
| `design_architecture(requirements)` | Produce ML architecture blueprint |
| `generate_code(architecture, lang)` | Generate working implementation |
| `create_deployment(code)` | Generate Docker / k8s / CI configs |
| `review_code(code)` | Code quality and security review |
| `refactor(code, goal)` | Refactor towards a stated goal |

## Quick Start

```python
from genesis import Genesis

g = Genesis(hf_token="hf_...")

# Full pipeline: description → working code
result = g.m3.build(
    "Build a sentiment analysis API for product reviews. "
    "Should handle batch requests and return confidence scores. "
    "Deploy on Railway with MongoDB for caching results."
)

print(result["architecture_diagram"])
print(result["code"]["app.py"])
print(result["code"]["requirements.txt"])
print(result["code"]["Dockerfile"])
print(result["code"]["railway.toml"])

# Just generate code
code = g.m3.generate_code(
    problem="Implement a BM25 document retriever in Python",
    language="python",
    style="production",  # production | prototype | educational
)
print(code)
```

# Contributing to GENESIS

## Setup

```bash
git clone https://github.com/your-org/genesis-ai.git
cd genesis-ai
pip install -r requirements-dev.txt
cp .env.example .env  # fill in HF_TOKEN
```

## Development Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Write code + tests
3. `make test` — all tests must pass
4. `make lint` — no lint errors
5. Open a pull request

## Module Guidelines

- All modules inherit from `BaseModule` (see `modules/base_module.py`)
- Every module must implement `run(query: str) -> str`
- Store knowledge to `KnowledgeGraph` collection `"knowledge"`
- Use `GemmaEngine.think_json()` for structured LLM output
- Add unit tests in `tests/unit/test_mX.py`

## Code Style

- Black formatting (`make format`)
- Type hints on all public functions
- Docstrings on all classes and public methods

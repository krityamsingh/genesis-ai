# ============================================================
# GENESIS — Makefile
# UPDATED 2026-04: ruff/black replacing flake8/isort
# ============================================================

.PHONY: help install install-dev lint format test test-cov \
        dev dev-frontend dev-admin build-frontend docker-build \
        docker-run seed clean

PYTHON  ?= python3
PIP     ?= pip
PORT    ?= 8000

help:
	@echo ""
	@echo "  GENESIS — Available Commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make install          Install Python deps"
	@echo "  make install-dev      Install dev + test deps"
	@echo "  make lint             Ruff + mypy"
	@echo "  make format           Black + ruff --fix"
	@echo "  make test             Run pytest"
	@echo "  make test-cov         Run pytest + coverage"
	@echo "  make dev              Start API server (reload)"
	@echo "  make dev-frontend     Start React frontend"
	@echo "  make dev-admin        Start admin panel"
	@echo "  make build-frontend   Build frontend for prod"
	@echo "  make docker-build     Build Docker image"
	@echo "  make docker-run       Run Docker container"
	@echo "  make seed             Run DB seeds"
	@echo "  make clean            Remove cache/dist files"
	@echo ""

install:
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

install-dev:
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements-dev.txt

lint:
	ruff check .
	mypy . --ignore-missing-imports

format:
	black .
	ruff check . --fix

test:
	pytest tests/ -v

test-cov:
	pytest tests/ -v --cov=. --cov-report=term-missing --cov-report=html

dev:
	uvicorn api.main:app --reload --port $(PORT) --log-level info

dev-frontend:
	cd frontend && npm run dev

dev-admin:
	cd admin/frontend && npm run dev

build-frontend:
	cd frontend && npm install && npm run build
	cd admin/frontend && npm install && npm run build

seed:
	$(PYTHON) scripts/seed_data.py

docker-build:
	docker build -t genesis-ai:2.1.0 .

docker-run:
	docker run -p 8080:8080 \
	  --env-file .env \
	  --name genesis-ai \
	  genesis-ai:2.1.0

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov .coverage coverage.xml 2>/dev/null || true
	rm -rf frontend/dist admin/frontend/dist 2>/dev/null || true

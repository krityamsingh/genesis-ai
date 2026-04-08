.PHONY: dev test lint seed export docker-up docker-down

dev:
	uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v --tb=short

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

lint:
	flake8 . --max-line-length=100 --exclude=.git,__pycache__,node_modules
	black --check .

format:
	black .
	isort .

seed:
	python scripts/seed_data.py

export:
	python scripts/export_model.py

docker-up:
	docker-compose -f infra/docker-compose.yml up -d

docker-down:
	docker-compose -f infra/docker-compose.yml down

celery:
	celery -A tasks.celery_app worker --loglevel=info

shell:
	python -c "from genesis import Genesis; print('Ready — create: g = Genesis(hf_token=HF_TOKEN)')"

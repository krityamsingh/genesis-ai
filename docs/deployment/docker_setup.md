# Docker Setup

```bash
cp .env.example .env  # fill in HF_TOKEN

# Start all services
docker-compose -f infra/docker-compose.yml up -d

# Check logs
docker-compose -f infra/docker-compose.yml logs -f api

# Stop
docker-compose -f infra/docker-compose.yml down
```

Services started: `api`, `celery`, `celery-beat`, `db` (postgres), `redis`, `chromadb`, `prometheus`

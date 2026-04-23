# GENESIS — Docker Deployment

## Single Container (Development)

```bash
# Build
docker build -t genesis-ai:2.1.0 .

# Run with .env file
docker run -p 8080:8080 --env-file .env genesis-ai:2.1.0

# Run with environment variables
docker run -p 8080:8080 \
  -e MONGO_URL=mongodb+srv://... \
  -e HF_TOKEN=hf_... \
  -e JWT_SECRET=your-secret \
  genesis-ai:2.1.0
```

## Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - MONGO_URL=mongodb://mongo:27017
      - MONGO_DB_NAME=genesis_ai
      - HF_TOKEN=${HF_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
      - ENV=production
    depends_on:
      mongo:
        condition: service_healthy
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  frontend:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"
    environment:
      - VITE_API_URL=http://localhost:8080

volumes:
  mongo_data:
```

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f api

# Stop
docker compose down
```

## Health Check

```bash
curl http://localhost:8080/health
# {"status": "ok", "service": "genesis-api", "db": "mongodb"}
```

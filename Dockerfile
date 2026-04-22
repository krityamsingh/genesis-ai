# ─────────────────────────────────────────────────────────────────────────────
# GENESIS v3 — Multi-stage Docker build
# Stage 1: Build React frontend
# Stage 2: Production Python API
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Frontend build ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Stage 2: API image ────────────────────────────────────────────────────────
FROM python:3.11-slim AS api

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl git ffmpeg libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Inject built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Non-root user
RUN useradd -m -u 1000 genesis && chown -R genesis:genesis /app
USER genesis

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]

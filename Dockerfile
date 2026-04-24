# Dockerfile — GENESIS (Phase 8: production hardened)
FROM python:3.11-slim AS deps

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 genesis

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Build frontend ─────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent 2>/dev/null || true
COPY frontend/ .
RUN npm run build 2>/dev/null || mkdir -p dist

# ── Final image ────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 genesis

COPY --from=deps /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=deps /usr/local/bin /usr/local/bin
COPY --chown=genesis:genesis . .
COPY --from=frontend --chown=genesis:genesis /app/frontend/dist ./frontend/dist

USER genesis
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]

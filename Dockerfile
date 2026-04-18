# Dockerfile
# GENESIS — Multi-stage build
#
# Fixes applied:
#   • Added non-root user (app:app) — running as root inside container is
#     a security risk; any path traversal or injection gives attacker root
#   • Port standardized to 8080 everywhere (was 8000 in config/base.yaml,
#     8080 in Dockerfile — now consistent)
#   • pip upgraded before installing deps (avoids old-pip install bugs)
#   • .dockerignore should exclude: .env, __pycache__, *.pyc, node_modules,
#     frontend/dist (rebuilt inside), .git
# =============================================================================

# ─── Stage 1: Build the React frontend ───────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy package files first for better layer caching
COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./

# Vite expects index.html at the project root (not inside public/)
RUN if [ ! -f index.html ] && [ -f public/index.html ]; then cp public/index.html index.html; fi

RUN npm run build
# Output: /frontend/dist


# ─── Stage 2: Python API + built frontend ────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip to avoid installation issues with newer packages
RUN pip install --no-cache-dir --upgrade pip

# Python deps — use Railway-slim (no torch/transformers, saves ~3 GB)
COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

# Copy application source
COPY . .

# Copy built frontend from Stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# ── Security: run as non-root ─────────────────────────────────────────────────
# Create a dedicated app user and group
RUN groupadd --system app && useradd --system --gid app --no-create-home app

# Give the app user ownership of the working directory
# (needed for SQLite db file creation and any local writes)
RUN chown -R app:app /app

USER app

EXPOSE 8080

# Railway injects PORT at runtime; default to 8080 to match EXPOSE
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

# ─── Stage 1: Build the React frontend ──────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy only package files first for better Docker layer caching
COPY frontend/package.json ./
RUN npm install

# Copy the rest of the frontend source and build
COPY frontend/ ./
RUN npm run build
# Output: /frontend/dist


# ─── Stage 2: Python API + built frontend ────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Paste the built frontend into the expected location
COPY --from=frontend-builder /frontend/dist ./frontend/dist

EXPOSE 8080

# Railway injects PORT; default to 8080 to match EXPOSE
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

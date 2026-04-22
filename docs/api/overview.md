# GENESIS API — Overview

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:8000` |
| Railway | `https://your-app.railway.app` |
| Docker | `http://localhost:8080` |

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via `/api/v1/auth/login`, `/api/v1/auth/google`, or `/api/v1/auth/otp/verify`.

Access tokens expire after `JWT_EXPIRE_HOURS` (default: 24h).

## Versioning

All routes are prefixed with `/api/v1/`. The legacy `/api/` prefix is retained for backwards compatibility but deprecated.

## Response Format

All API responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "optional human-readable note"
}
```

Errors return HTTP 4xx/5xx with:

```json
{
  "detail": "Error description",
  "error_code": "GENESIS_ERROR_CODE"
}
```

## Rate Limiting

| Endpoint group | Limit |
|---|---|
| `/auth/login` | 10 req / 60s per IP |
| `/api/v1/core/*` | 100 req / 60s per user |
| `/api/v1/training/*` | 10 req / 60s per user |
| WebSocket `/ws/stream` | 1 connection per user |

On limit exceeded the API returns `429 Too Many Requests` with `Retry-After` header.

## Pagination

List endpoints accept `?skip=0&limit=20`. Maximum `limit` is 100.

## Health Check

```
GET /health
```

Returns `{"status": "ok", "service": "genesis-api", "db": "mongodb"}`.

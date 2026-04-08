# Authentication

GENESIS uses JWT (HS256) tokens.

## Login (admin)

```bash
curl -X POST "http://localhost:8000/api/v1/admin/login?username=admin&password=changeme"
```

Response: `{ "access_token": "eyJ...", "token_type": "bearer" }`

## Using the token

```bash
curl -H "Authorization: Bearer eyJ..." http://localhost:8000/api/v1/core/stats
```

## Token expiry

Default: 24 hours. Configure with `JWT_EXPIRE_HOURS` env var.

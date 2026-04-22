# GENESIS Authentication Guide

GENESIS supports three login methods:

## 1. Email + Password

Classic credential login.

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@genesis.ai", "password": "Genesis@2024!"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "64f3...",
    "username": "admin",
    "email": "admin@genesis.ai",
    "is_admin": true,
    "display_name": "Admin"
  }
}
```

Use the token:
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 2. Google OAuth

1. Navigate to `GET /api/v1/auth/google` — redirects to Google
2. User signs in with their Google account
3. Google redirects to `/api/v1/auth/google/callback`
4. Server creates/updates the user and sets a session cookie
5. Frontend receives `access_token` + optional `needs_name_setup` flag

**Required .env vars:**
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
SESSION_SECRET_KEY=your-32-char-hex-key
```

## 3. SMS OTP

One-time password via Twilio SMS.

**Step 1 — Send OTP:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

**Step 2 — Verify OTP:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "code": "482931"}'
```

Returns same `access_token` format as password login.

**Required .env vars:**
```
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+15005550006
```

## JWT Token Lifecycle

- Access token: valid for `JWT_EXPIRE_HOURS` (default 24h)
- On logout: token JTI is blacklisted in MongoDB (TTL auto-expires after 48h)
- First-time Google/OTP users get `needs_name_setup: true` — redirect them to `/setup-name`

## Frontend Token Storage

The `useAuth` hook stores the token in `localStorage` under `genesis_token`.
Auto-refresh is triggered 5 minutes before expiry if the user is active.

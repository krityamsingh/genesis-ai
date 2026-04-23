# GENESIS API — Endpoint Reference

## Auth

### POST /api/v1/auth/login
Email + password login. Returns `access_token`.

**Body:**
```json
{ "email": "user@example.com", "password": "secret" }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "email": "...", "is_admin": false }
}
```

---

### POST /api/v1/auth/register
Create a new user account.

**Body:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "StrongPass123!"
}
```

---

### GET /api/v1/auth/me
Returns the current authenticated user.

---

### POST /api/v1/auth/logout
Blacklists the current JWT. Requires `Authorization` header.

---

### GET /api/v1/auth/google
Redirects to Google OAuth consent screen.

---

### GET /api/v1/auth/google/callback
Handles OAuth redirect. Sets session cookie. Redirects to frontend.

---

### POST /api/v1/auth/otp/send
Send OTP SMS to a phone number.

**Body:** `{ "phone": "+1234567890" }`

---

### POST /api/v1/auth/otp/verify
Verify OTP code and return JWT.

**Body:** `{ "phone": "+1234567890", "code": "123456" }`

---

## Core (AI)

### POST /api/v1/core/ask
Single-turn question answering.

**Body:**
```json
{
  "query": "What is self-attention?",
  "module": "m1",
  "temperature": 0.7,
  "max_tokens": 1024
}
```

---

### POST /api/v1/core/learn
Ingest knowledge from a source.

**Body:**
```json
{
  "source": "https://arxiv.org/abs/1706.03762",
  "source_type": "url"
}
```
`source_type`: `"url"` | `"text"` | `"pdf"` | `"audio"`

---

### POST /api/v1/core/route
Auto-route a query to the best module.

**Body:** `{ "query": "Simulate a market crash" }`

**Response:**
```json
{
  "module": "m6",
  "intent": "simulate",
  "confidence": 0.85,
  "response": "..."
}
```

---

## Conversations

### GET /api/v1/conversations
List all conversations for the current user.

**Query:** `?skip=0&limit=20`

---

### POST /api/v1/conversations
Create a new conversation.

**Body:** `{ "title": "My research session", "module": "m2" }`

---

### GET /api/v1/conversations/{id}
Get a conversation with its messages.

---

### DELETE /api/v1/conversations/{id}
Delete a conversation and all its messages.

---

### POST /api/v1/conversations/{id}/messages
Send a message in a conversation. Triggers AI response.

**Body:**
```json
{
  "content": "Explain transformers to me",
  "role": "user"
}
```

---

## Modules

### GET /api/v1/modules
List all modules and their enabled/disabled state.

### PATCH /api/v1/modules/{module_id}/toggle
Enable or disable a module. Admin only.

---

## Training

### POST /api/v1/training/jobs
Start a new training job.

### GET /api/v1/training/jobs
List training jobs.

### GET /api/v1/training/jobs/{job_id}
Get status and logs for a training job.

### DELETE /api/v1/training/jobs/{job_id}
Cancel or delete a training job.

---

## Admin

### GET /api/v1/admin/users
List all users. Admin only.

### GET /api/v1/admin/login-history
Login session log with method badges. Admin only.

### GET /api/v1/admin/login-history/export
Download login history as CSV. Admin only.

### POST /api/v1/admin/users/{id}/promote
Grant admin privileges to a user.

### POST /api/v1/admin/users/{id}/demote
Remove admin privileges.

### POST /api/v1/admin/users/{id}/ban
Deactivate a user account.

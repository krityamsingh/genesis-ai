# Genesis AI — MongoDB Rebuild Notes

## What Changed (All 23 Tasks from the Rebuild Plan)

### Phase 1 — MongoDB Layer ✅
| File | Action | Notes |
|---|---|---|
| `database/models_mongo.py` | NEW | 8 Beanie Document classes (User, LoginSession, Conversation, Message, ModuleState, PromptLog, OtpCode, RateLimit) |
| `database/mongo.py` | NEW | `connect_db()` / `close_db()` replacing `db.py` |
| `database/seeds_mongo.py` | NEW | Async idempotent seeder |
| `security/rate_limiter_mongo.py` | NEW | MongoDB TTL-based rate limiter + token blacklist |
| `database/db.py` | ARCHIVED | Moved to `_archived_sql_files/` |
| `database/models.py` | ARCHIVED | Moved to `_archived_sql_files/` |
| `database/seeds.py` | ARCHIVED | Moved to `_archived_sql_files/` |
| `database/migrations/` | ARCHIVED | Moved to `_archived_sql_files/` |
| `alembic.ini` | ARCHIVED | Moved to `_archived_sql_files/` |

### Phase 2 — Auth Routes ✅
| File | Action | Notes |
|---|---|---|
| `api/main.py` | REPLACE | `connect_db()` + `SessionMiddleware` + async seeds |
| `api/routes.py` | MODIFY | Registers OTP, conversations, OAuth routers |
| `api/v1/auth_routes.py` | REPLACE | Beanie queries, login session recording, MongoDB blacklist |
| `api/v1/auth_routes_oauth.py` | REPLACE | Beanie, session recording, `needs_name_setup` flag |
| `api/v1/auth_otp_routes.py` | NEW | OTP send/verify + `/setup-name` |
| `api/v1/conversation_routes.py` | NEW | Full CRUD: list, create, get, delete, messages, send |

### Phase 3 — Admin Backend ✅
| File | Action | Notes |
|---|---|---|
| `api/v1/admin_routes.py` | MODIFY | `/login-history` + CSV export, Beanie user CRUD, promote/demote |
| `admin/backend/auth.py` | REPLACE | Beanie query + login session recording |
| `admin/backend/user_manager.py` | REPLACE | Beanie, new fields (phone, display_name, session_count) |
| `admin/backend/prompt_manager.py` | REPLACE | Beanie PromptLog queries |
| `admin/backend/module_controller.py` | REPLACE | Beanie ModuleState queries |
| `api/v1/module_routes.py` | MODIFY | Persists enabled/disabled to MongoDB (was in-memory) |

### Phase 4 — Frontend ✅
| File | Action | Notes |
|---|---|---|
| `frontend/src/styles/design-system.css` | NEW | CSS variables matching Claude.ai |
| `frontend/src/hooks/useAuth.js` | NEW | Token mgmt, `/auth/me`, refresh, login, logout, setupName |
| `frontend/src/hooks/useConversations.js` | NEW | Conversation list, create, select, send, delete |
| `frontend/src/pages/LoginPage.jsx` | NEW | Claude-style: Google button, OTP tab, email+password fallback |
| `frontend/src/pages/NameSetupPage.jsx` | NEW | First-time display name setup |
| `frontend/src/pages/AuthCallback.jsx` | REPLACE | Handles OAuth redirect with `needs_name_setup` |
| `frontend/src/pages/ChatApp.jsx` | NEW | Main chat shell: Sidebar + ChatArea + streaming |
| `frontend/src/components/Sidebar.jsx` | NEW | Conversation list, new chat button, user footer |
| `frontend/src/components/Message.jsx` | NEW | User/assistant bubbles with copy button |
| `frontend/src/components/InputBar.jsx` | NEW | Auto-expanding textarea, Enter to send |
| `frontend/src/api/client.js` | REPLACE | All new endpoints: OTP, conversations, login-history |
| `frontend/src/App.jsx` | MODIFY | Added `/chat`, `/setup-name` routes |

### Phase 5 — Admin Frontend ✅
| File | Action | Notes |
|---|---|---|
| `admin/frontend/src/AdminApp.jsx` | REPLACE | White Claude-style sidebar, LoginHistory tab added |
| `admin/frontend/src/AdminLogin.jsx` | REPLACE | White card replacing dark neon login |
| `admin/frontend/src/UserManager.jsx` | MODIFY | phone, display_name, google_id, session_count, promote/demote/ban |
| `admin/frontend/src/logsviewer.jsx` | MODIFY | Level filter, search, color-coded severity |
| `admin/frontend/src/LoginHistory.jsx` | NEW | Full session table: method badges, duration, CSV export |

### Config Changes ✅
| File | Action |
|---|---|
| `requirements.txt` | Added: motor, beanie, pymongo, authlib, itsdangerous, twilio. Removed: sqlalchemy, alembic, aiosqlite, redis |
| `.env` | Added: MONGO_URL, MONGO_DB_NAME, GOOGLE_*, SESSION_SECRET_KEY, TWILIO_*. Removed: DATABASE_URL, REDIS_URL |
| `api/schemas.py` | Added: ConversationCreate/Response, MessageCreate/Response, LoginSessionResponse, OtpSendRequest, OtpVerifyRequest, NameSetupRequest |

---

## Setup Instructions

### Step 1 — MongoDB
```bash
# Option A: Atlas (recommended for production)
# Go to mongodb.com/atlas → Create free M0 cluster → copy connection string

# Option B: Local
docker run -d -p 27017:27017 mongo:7
```

Set in `.env`:
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
MONGO_DB_NAME=genesis_ai
```

### Step 2 — Install Python packages
```bash
pip install motor beanie pymongo authlib httpx itsdangerous twilio
pip uninstall sqlalchemy alembic aiosqlite redis -y
# Or just:
pip install -r requirements.txt
```

### Step 3 — Google OAuth (optional)
1. Go to console.cloud.google.com → APIs & Services → OAuth consent screen
2. Create credentials → OAuth 2.0 Client ID → Web application
3. Add redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
4. Copy Client ID and Secret to `.env`

### Step 4 — Twilio OTP (optional)
1. Create free Twilio account at twilio.com
2. Buy a phone number with SMS capability
3. Copy Account SID, Auth Token, Phone Number to `.env`

### Step 5 — Run
```bash
# Backend
uvicorn api.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev

# Admin frontend (separate terminal)
cd admin/frontend && npm install && npm run dev
```

### Step 6 — Frontend packages
```bash
cd frontend
npm install react-router-dom react-markdown remark-gfm lucide-react
```

---

## Testing Checklist
- [ ] Google OAuth: login → name setup → chat → history saved → logout → re-login → history restored
- [ ] OTP: send SMS → enter code → name setup → chat
- [ ] Admin: login with admin email → verify all tabs visible → login history shows sessions
- [ ] JWT refresh: verify auto-refresh works when access token expires
- [ ] Rate limiting: hit /auth/login 11 times in 60s → expect 429
- [ ] Module persistence: enable M2 via admin → restart server → verify M2 still enabled

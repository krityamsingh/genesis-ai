
> [!WARNING]
> 🚧 **This project is currently under active development and testing. Expect breaking changes. Not production-ready yet.**

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Gemma_3-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co)
[![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Modules](#-modules) · [API Reference](#-api-reference) · [Deployment](#-deployment) · [Admin Panel](#-admin-panel)

```
 ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗
██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝
██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗
██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║
╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║
 ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝
```

**A Modular, Self-Learning AI System built on Gemma 3**

*Learns from any source. Teaches back. Generates hypotheses. Simulates realities.*

</div>

---

## What is GENESIS?

GENESIS is a self-learning AI system that can ingest knowledge from any source — URLs, PDFs, audio files, raw text — build a persistent knowledge graph from it, and then teach, quiz, generate flashcards, build study plans, run Bayesian reasoning, simulate scenarios, and much more.

It is designed as a modular pipeline where each **module** handles a different class of intelligence task. Modules are independently enabled/disabled, and the system auto-routes queries to the best module based on intent detection.

**Core capabilities:**
- 📥 Ingest knowledge from URLs, PDFs, audio, YouTube, and raw text
- 🧠 Answer questions, explain topics, generate quizzes and flashcards
- 🔬 Parse research papers, generate hypotheses, find cross-domain connections
- 🏗️ Design ML architectures and generate deployment-ready code
- 📅 Reconstruct historical timelines and project future scenarios
- 🔮 Run Bayesian reasoning and fill knowledge gaps
- 🌍 Simulate what-if scenarios and synthesize simulation code
- 🎙️ Voice interface (TTS + STT via gTTS and Whisper)
- ⚡ Real-time WebSocket streaming
- 🔐 JWT auth, admin panel, full REST API

---

## ⚡ Quick Start

### Python SDK

```python
from genesis import Genesis

g = Genesis(hf_token="hf_your_token_here")

# Feed knowledge from any source
g.learn("https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)")
g.learn("path/to/research_paper.pdf")
g.learn("The attention mechanism computes a weighted sum of values...")

# Query the knowledge base
print(g.ask("What is self-attention?"))
print(g.teach("transformers", level="beginner"))
print(g.quiz("attention mechanisms", n=3))
print(g.flashcards("transformer architecture", n=5))

# Auto-route complex queries to the best module
result = g.route("Simulate a market crash scenario")
print(result)  # → routed to M6 Reality Sim

# Voice
g.speak("Hello, I am GENESIS")
transcript = g.listen("audio.mp3")

# Stats
print(g.stats())
```

### API Server

```bash
# 1. Clone the repo
git clone https://github.com/your-org/genesis-ai.git
cd genesis-ai

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — add HF_TOKEN at minimum

# 4. Seed the database (creates admin user + module states)
python scripts/seed_data.py

# 5. Start the API server
uvicorn api.main:app --reload --port 8000

# 6. Start the frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Visit:
- **API docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173
- **Health check**: http://localhost:8000/health

---

## 🏗️ Architecture

```
genesis.py                    ← Top-level Python SDK facade
│
├── core/
│   ├── gemma_engine.py       ← HuggingFace InferenceClient (Gemma 3 27B/12B/4B/CodeGemma)
│   ├── knowledge_graph.py    ← ChromaDB vector store (TF-IDF fallback)
│   ├── memory_manager.py     ← Conversation + session memory
│   ├── router.py             ← Intent detection + module dispatch
│   └── voice_interface.py    ← TTS (gTTS) + STT (Whisper)
│
├── modules/
│   ├── m1_self_learner/      ← Ingestion → SkillExtractor → KnowledgeBuilder → Teacher
│   ├── m2_research_accel/    ← PaperParser → HypothesisGen → ConnectionFinder → Ranker
│   ├── m3_ai_builder/        ← ProblemParser → ArchDesigner → CodeGenerator → Deployer
│   ├── m4_time_reconstruct/  ← HistoryReconstructor → FutureProjector → TimelineRenderer
│   ├── m5_intuition_engine/  ← BayesianReasoner → GapFiller → CrossModuleGlue → Explainer
│   └── m6_reality_sim/       ← WorldObserver → SimRunner → ResultsAnalyzer → CodeSynthesizer
│
├── api/                      ← FastAPI app, routes, schemas, WebSocket, middleware
├── admin/                    ← Admin backend + React admin panel frontend
├── global_panel/             ← Research/prompt playground panel backend + frontend
├── frontend/                 ← Main React + Vite + Tailwind user interface
├── database/                 ← SQLAlchemy ORM models + Alembic migrations
├── security/                 ← JWT handler, password hash, CORS, rate limiter, permissions
├── tasks/                    ← Celery async task queue (training, ingestion, simulation)
├── data/pipeline/            ← Preprocessor, validator, augmentor, splitter
├── monitoring/               ← Prometheus + Grafana configs
├── infra/                    ← Docker, docker-compose, Kubernetes, Nginx, Cloud Run
└── tests/                    ← Full pytest suite (unit + integration)
```

### Request Flow

```
Client
  │
  ├─ REST  →  FastAPI (api/main.py)
  │              ↓
  │           Router (core/router.py)  ← intent detection
  │              ↓
  │           Module M1–M6
  │              ↓
  │           GemmaEngine  →  HuggingFace API
  │              ↓
  │           KnowledgeGraph (ChromaDB)
  │
  └─ WS    →  /ws/stream  →  engine.think_stream()  →  token chunks
```

---

## 🧩 Modules

| Module | Key | Status | Description |
|--------|-----|--------|-------------|
| 🧠 **Self-Learner** | `m1` | ✅ Active | Learn from URL/PDF/text/audio. Ask, teach, quiz, flashcards, study plans, knowledge gaps, hypotheses |
| 🔬 **Research Accelerator** | `m2` | ⚙️ Disabled | Parse papers, generate hypotheses, find cross-domain connections, rank results |
| 🏗️ **AI Builder** | `m3` | ⚙️ Disabled | Parse ML problems → design architecture → generate code → deploy |
| 📅 **Time Reconstruct** | `m4` | ⚙️ Disabled | Reconstruct historical timelines, project futures, analyse images chronologically |
| 🔮 **Intuition Engine** | `m5` | ⚙️ Disabled | Bayesian reasoning, knowledge gap filling, cross-module synthesis, explainer |
| 🌍 **Reality Sim** | `m6` | ⚙️ Disabled | Observe world state, run what-if simulations, generate simulation code |

Only **M1** is active by default. Enable others via the admin API or environment variables:

```bash
# Enable via admin API (requires JWT token)
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  "https://your-api.railway.app/admin/modules/m2?enabled=true"
```

---

## 📡 API Reference

Base URL: `http://localhost:8000` (or your Railway URL)

Interactive docs at `/docs` (Swagger) or `/redoc`.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/core/learn` | Feed any source to M1 Self-Learner |
| `POST` | `/core/ask` | Ask a question from stored knowledge |
| `POST` | `/core/teach` | Explain a topic at a specified level |
| `POST` | `/core/quiz` | Generate quiz questions on a topic |
| `POST` | `/core/flashcards` | Generate flashcards |
| `POST` | `/core/summarise` | Summarise the entire knowledge base |
| `POST` | `/core/route` | Auto-route query to the best module |
| `GET` | `/core/stats` | Full system statistics |

### Module Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/modules/` | List all modules and active status |
| `POST` | `/modules/m1/connections` | Find connections between stored concepts |
| `POST` | `/modules/m1/gaps` | Identify knowledge gaps on a topic |
| `POST` | `/modules/m1/compare` | Compare two topics side by side |
| `POST` | `/modules/m1/study-plan` | Generate a structured study plan |
| `POST` | `/modules/m1/hypotheses` | Generate hypotheses on a topic |

### Panel Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/panel/overview` | KG + M1 + router + memory overview |
| `GET` | `/panel/kg/export` | Export knowledge graph as JSON |
| `WS` | `/ws/stream` | Real-time streaming WebSocket |

### Example Requests

```bash
# Learn from a URL
curl -X POST http://localhost:8000/core/learn \
  -H "Content-Type: application/json" \
  -d '{"source": "https://arxiv.org/abs/1706.03762"}'

# Ask a question
curl -X POST http://localhost:8000/core/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is multi-head attention?"}'

# Generate a quiz
curl -X POST http://localhost:8000/core/quiz \
  -H "Content-Type: application/json" \
  -d '{"query": "transformers", "n": 5, "show_answers": true}'

# Auto-route a complex query
curl -X POST http://localhost:8000/core/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Reconstruct the history of the internet"}'
```

### WebSocket Streaming

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/stream')

ws.onopen = () => {
  // Stream a generation
  ws.send(JSON.stringify({
    action: 'think',
    payload: 'Explain quantum entanglement in simple terms'
  }))

  // Or learn from a source
  ws.send(JSON.stringify({
    action: 'learn',
    payload: 'https://en.wikipedia.org/wiki/Quantum_entanglement'
  }))
}

ws.onmessage = (e) => {
  if (e.data === '[DONE]') console.log('Stream complete')
  else process.stdout.write(e.data)  // stream chunks as they arrive
}
```

---

## 🔐 Authentication

GENESIS uses JWT (HS256) tokens for admin endpoints.

```bash
# 1. Login to get a token
curl -X POST "http://localhost:8000/admin/login?username=admin&password=your_password"
# → {"access_token": "eyJ...", "token_type": "bearer"}

# 2. Use token in all admin requests
curl -H "Authorization: Bearer eyJ..." http://localhost:8000/admin/health
```

Token expiry defaults to **24 hours**. Configure with `JWT_EXPIRE_HOURS` env variable.

---

## 🛡️ Admin Panel

The admin panel is a standalone React app in `admin/frontend/` with the following sections:

| Tab | Description |
|-----|-------------|
| **Health** | System health — KG, engine, memory status |
| **Model** | Current Gemma model info and configuration |
| **Modules** | Enable/disable M1–M6 modules |
| **Users** | User management (list, create) |
| **Logs** | Live log viewer (last N lines) |

### Admin API Endpoints

All admin routes require a valid admin JWT token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/login` | Get JWT token |
| `GET` | `/admin/health` | Full system health |
| `GET` | `/admin/model` | Gemma model info |
| `GET` | `/admin/modules` | List module states |
| `PUT` | `/admin/modules/{key}` | Enable/disable a module |
| `GET` | `/admin/users` | List all users |
| `GET` | `/admin/logs?n=100` | Last N log lines |
| `POST` | `/admin/backup` | Backup knowledge graph |
| `GET` | `/admin/datasets` | List datasets |
| `GET` | `/admin/prompts?n=50` | Recent prompt logs |
| `DELETE` | `/admin/prompts` | Clear prompt logs |
| `GET` | `/admin/kg/stats` | KG collection statistics |
| `POST` | `/admin/kg/reset/{collection}` | Reset a KG collection |
| `POST` | `/admin/kg/reset-all` | ⚠️ Wipe all KG collections |

---

## 🌍 Deployment

### Railway (Recommended)

The repo ships with a ready `railway.toml`. One-click deploy:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

After deploy:
1. Go to your service → **Settings** → **Networking** → **Generate Domain**
2. Add required environment variables (see below)
3. Visit `https://your-url.railway.app/health` to confirm

### Docker

```bash
# Build
docker build -t genesis-api .

# Run
docker run -p 8000:8000 \
  -e HF_TOKEN=hf_your_token \
  -e ADMIN_PASSWORD=your_secure_password \
  -e JWT_SECRET=your_32_char_secret \
  genesis-api
```

### Docker Compose (full stack)

```bash
docker-compose -f infra/docker-compose.yml up
```

Starts: API server + Redis (Celery) + ChromaDB + Nginx reverse proxy.

### Kubernetes

```bash
kubectl apply -f infra/k8s/deployment.yaml
kubectl apply -f infra/k8s/service.yaml
kubectl apply -f infra/k8s/ingress.yaml
```

### Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/genesis-api

gcloud run deploy genesis-api \
  --image gcr.io/YOUR_PROJECT/genesis-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars HF_TOKEN=hf_...
```

---

## 🖥️ Frontend Apps

There are **three separate frontend applications**, each requiring independent deployment:

### 1. Main Frontend (`frontend/`)
React + Vite + Tailwind. The main user-facing interface.

**Pages:** Dashboard · Modules · Knowledge Graph · Timeline · Voice Input

```bash
cd frontend
npm install
cp .env.example .env  # set VITE_API_URL=https://your-api.railway.app
npm run dev           # dev server on :5173
npm run build         # production build to dist/
```

### 2. Admin Panel (`admin/frontend/`)
React admin interface with login, system health, model monitor, module manager, user manager, and log viewer.

```bash
cd admin/frontend
npm install
cp .env.example .env  # set VITE_API_URL=https://your-api.railway.app
npm run build
```

> ⚠️ **Keep this deployment private** — it exposes full admin controls.

### 3. Global Panel (`global_panel/frontend/`)
Research and prompt engineering tool — prompt playground, benchmark panel, compare panel, export, and prompt history.

```bash
cd global_panel/frontend
npm install
npm run build
```

### Deploying Frontends to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Set **Root Directory** to `frontend` (or `admin/frontend` for the admin app)
3. Add environment variable: `VITE_API_URL = https://your-api.railway.app`
4. Deploy — Vercel auto-detects Vite
5. Add your Vercel URL to `CORS_ORIGINS` in Railway variables

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

### Required

| Variable | Description |
|----------|-------------|
| `HF_TOKEN` | HuggingFace API token — **required for all AI functionality** |
| `ADMIN_PASSWORD` | Admin login password (default: `changeme` — **change this immediately**) |
| `JWT_SECRET` | Secret for signing JWT tokens — use a long random string |

### Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | SQLite in-memory |
| `ADMIN_EMAIL` | Admin account email | `admin@genesis.local` |
| `JWT_EXPIRE_HOURS` | Token expiry in hours | `24` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis URL for Celery task queue | — |
| `KG_PERSIST_DIR` | ChromaDB persistence directory | in-memory |
| `GEMMA_MODEL` | Model variant: `default` \| `fast` \| `mini` \| `code` | `default` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:3000,http://localhost:5173` |

### ⚠️ Security Checklist Before Going Public

- [ ] Set a strong `ADMIN_PASSWORD` (the default `changeme` is in the source code)
- [ ] Set a long random `JWT_SECRET` (default is `genesis-dev-secret-CHANGE-IN-PROD`)
- [ ] Set `HF_TOKEN` — without it all AI endpoints silently fail
- [ ] Set `DATABASE_URL` to PostgreSQL — Railway's ephemeral filesystem resets on redeploy
- [ ] Add your frontend URL(s) to `CORS_ORIGINS`

---

## 🗄️ Database

GENESIS uses **SQLAlchemy** with **Alembic** for migrations. Default is SQLite (for local dev); PostgreSQL is recommended for production.

### Models

| Table | Description |
|-------|-------------|
| `users` | User accounts with admin flag, hashed passwords |
| `learning_sessions` | Log of every M1 `learn()` call |
| `prompt_logs` | Full log of every LLM prompt and response |
| `module_states` | Per-module enabled/disabled state and config |

### Seed Data

```bash
python scripts/seed_data.py
```

Creates default `admin` user and initialises module states (M1 enabled, M2–M6 disabled).

### Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "add new table"

# Apply migrations
alembic upgrade head
```

---

## 🧪 Testing

```bash
# All tests
make test

# Unit tests only
make test-unit

# Integration tests only
make test-integration

# Or directly with pytest
pytest tests/unit/
pytest tests/integration/
pytest --cov=. --cov-report=html  # with coverage
```

Test files:

```
tests/
├── unit/
│   ├── test_core.py       ← GemmaEngine, KG, Memory, Router
│   ├── test_m1.py         ← Self-Learner
│   ├── test_m2.py         ← Research Accelerator
│   ├── test_m3.py         ← AI Builder
│   ├── test_m4.py         ← Time Reconstruct
│   ├── test_m5.py         ← Intuition Engine
│   └── test_m6.py         ← Reality Sim
└── integration/
    ├── test_admin.py       ← Admin API end-to-end
    ├── test_global_panel.py
    └── test_integration.py ← Full stack tests
```

---

## 📁 Project Structure

```
genesis-ai/
├── genesis.py               ← Python SDK entry point
├── api/
│   ├── main.py              ← FastAPI app factory
│   ├── routes.py            ← Route registration
│   ├── schemas.py           ← Pydantic request/response models
│   ├── dependencies.py      ← Lazy dependency injectors (lru_cache)
│   ├── middleware.py        ← Logging middleware
│   ├── websocket.py         ← /ws/stream endpoint
│   ├── error_handlers.py    ← Global exception handlers
│   ├── cache.py             ← Response caching
│   └── v1/
│       ├── core_routes.py   ← /core/* endpoints
│       ├── module_routes.py ← /modules/* endpoints
│       ├── admin_routes.py  ← /admin/* endpoints
│       └── panel_routes.py  ← /panel/* endpoints
├── core/
│   ├── gemma_engine.py      ← Gemma 3 wrapper (27B/12B/4B/CodeGemma)
│   ├── knowledge_graph.py   ← ChromaDB + TF-IDF vector store
│   ├── memory_manager.py    ← Conversation memory + session persistence
│   ├── router.py            ← Intent detection + module dispatch
│   └── voice_interface.py   ← gTTS + Whisper STT
├── modules/
│   ├── base_module.py       ← Abstract base class for all modules
│   ├── m1_self_learner/     ← ingestion, knowledge_builder, skill_extractor, teacher
│   ├── m2_research_accel/   ← paper_parser, hypothesis_gen, connection_finder, ranker
│   ├── m3_ai_builder/       ← problem_parser, arch_designer, code_generator, deployer
│   ├── m4_time_reconstruct/ ← history_reconstructor, future_projector, timeline_renderer
│   ├── m5_intuition_engine/ ← bayesian_reasoner, gap_filler, cross_module_glue, explainer
│   └── m6_reality_sim/      ← world_observer, sim_runner, results_analyzer, code_synthesizer
├── admin/
│   ├── backend/             ← auth, health_check, model_monitor, user_manager, logs_viewer, etc.
│   └── frontend/            ← React admin panel (AdminApp, AdminLogin, SystemHealth, etc.)
├── global_panel/
│   ├── backend/             ← panel_api, prompt_logger, session_manager, export_manager
│   └── frontend/            ← React panel (PromptPlayground, BenchmarkPanel, ComparePanel, etc.)
├── frontend/                ← Main React + Vite + Tailwind app
├── database/
│   ├── models.py            ← SQLAlchemy ORM (User, LearningSession, PromptLog, ModuleState)
│   ├── db.py                ← Session factory + init_db
│   ├── seeds.py             ← Default data seeder
│   └── migrations/          ← Alembic migration scripts
├── security/
│   ├── jwt_handler.py       ← HS256 JWT create/decode
│   ├── password_hash.py     ← bcrypt hashing
│   ├── permissions.py       ← require_auth / require_admin
│   ├── cors_config.py       ← CORS settings
│   └── rate_limiter.py      ← Per-IP rate limiting
├── tasks/
│   ├── celery_app.py        ← Celery app factory
│   ├── celery_beat.py       ← Periodic task scheduler
│   ├── ingestion_tasks.py   ← Async ingestion jobs
│   ├── training_tasks.py    ← Fine-tuning tasks
│   └── sim_tasks.py         ← Simulation tasks
├── data/pipeline/           ← preprocessor, validator, augmentor, splitter
├── models/
│   ├── configs/             ← Gemma 4 base, finetune, inference configs
│   └── registry.json        ← Model registry
├── config/
│   ├── base.yaml            ← Base configuration
│   ├── development.yaml     ← Dev overrides
│   ├── staging.yaml         ← Staging overrides
│   └── production.yaml      ← Production overrides
├── monitoring/
│   ├── prometheus.yml       ← Metrics scrape config
│   ├── grafana/             ← Dashboard JSON
│   └── alerts.yml           ← Alert rules
├── infra/
│   ├── Dockerfile           ← Production Docker image
│   ├── docker-compose.yml   ← Full stack local dev
│   ├── nginx.conf           ← Reverse proxy config
│   ├── k8s/                 ← Kubernetes manifests
│   └── cloud-run.yaml       ← GCP Cloud Run config
├── scripts/
│   ├── setup.sh             ← Environment bootstrap
│   ├── seed_data.py         ← DB seeder
│   ├── export_model.py      ← Model export utility
│   └── run_tests.sh         ← Test runner
├── notebooks/
│   ├── 01_gemma4_experiments.ipynb
│   ├── 02_module_testing.ipynb
│   └── 03_benchmark_results.ipynb
├── docs/
│   ├── api/                 ← Authentication, endpoints, overview, websockets
│   ├── deployment/          ← Local setup, Docker, cloud deploy guides
│   └── modules/             ← Per-module guide (m1–m6)
├── tests/                   ← Unit + integration test suites
├── Dockerfile               ← Root-level Dockerfile (used by Railway)
├── railway.toml             ← Railway deployment config
├── requirements.txt         ← Python dependencies
├── pyproject.toml           ← Project metadata + tool config
├── alembic.ini              ← Alembic config
└── Makefile                 ← Development shortcuts
```

---

## 🛠️ Makefile Commands

```bash
make test              # Run all tests
make test-unit         # Run unit tests only
make test-integration  # Run integration tests only
make lint              # Run flake8 linting
make seed              # Seed the database
make migrate           # Run Alembic migrations
```

---

## 🔌 Postman Collection

A Postman collection is included at `docs/postman_collection.json` with pre-built requests for all endpoints. Import it into Postman and set the `base_url` variable to your deployment URL.

---

## 🗺️ Roadmap

- [ ] ChromaDB persistent storage enabled by default
- [ ] M2–M6 modules fully activated
- [ ] Fine-tuning pipeline via Celery tasks
- [ ] Multi-user session isolation
- [ ] Streaming frontend UI (real-time token rendering)
- [ ] Voice input in browser (WebRTC microphone)
- [ ] Knowledge graph visualisation UI
- [ ] Kaggle integration for dataset ingestion

---

## 🤝 Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-module`
3. Commit your changes: `git commit -m "feat: add amazing module"`
4. Push: `git push origin feature/amazing-module`
5. Open a Pull Request

Please use [conventional commits](https://www.conventionalcommits.org/) and ensure tests pass before opening a PR.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of changes.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ⚡ by the GENESIS team

*Learn everything. Forget nothing.*

</div>

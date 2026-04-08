# ⚡ GENESIS — Self-Learning AI System

GENESIS is a modular, self-learning AI system built on Gemma 3 (via HuggingFace).
It learns from any source, teaches back, generates hypotheses, simulates realities, and more.

## Quick Start

```bash
# 1. Install
pip install -r requirements.txt

# 2. Set token
export HF_TOKEN=hf_your_token_here

# 3. Use in Python
from genesis import Genesis
g = Genesis(hf_token=HF_TOKEN)
g.learn("https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)")
print(g.ask("What is self-attention?"))
print(g.teach("transformers", level="beginner"))
print(g.quiz("attention mechanisms", n=3))
```

## Modules

| Module | Key | Description |
|--------|-----|-------------|
| 🧠 Self-Learner     | `m1` | Learn from URL/PDF/text/audio. Ask, teach, quiz, flashcards, study plans |
| 🔬 Research Accel  | `m2` | Parse papers, generate hypotheses, find cross-domain connections |
| 🏗️ AI Builder      | `m3` | Parse ML problems → design architecture → generate code → deploy |
| 📅 Time Reconstruct| `m4` | Reconstruct historical timelines, project futures, analyse images |
| 🔮 Intuition Engine| `m5` | Bayesian reasoning, knowledge gap filling, cross-module synthesis |
| 🌍 Reality Sim     | `m6` | Observe world state, run what-if simulations, generate sim code |

## Architecture

```
genesis.py          ← top-level facade
├── core/
│   ├── gemma_engine.py      ← HuggingFace InferenceClient wrapper
│   ├── knowledge_graph.py   ← ChromaDB / TF-IDF vector store
│   ├── memory_manager.py    ← conversation + session memory
│   ├── router.py            ← intent detection + module dispatch
│   └── voice_interface.py   ← TTS (gTTS) + STT (Whisper)
├── modules/
│   ├── m1_self_learner/     ← Ingestion → SkillExtractor → KnowledgeBuilder → Teacher
│   ├── m2_research_accel/   ← PaperParser → HypothesisGen → ConnectionFinder → Ranker
│   ├── m3_ai_builder/       ← ProblemParser → ArchDesigner → CodeGenerator → Deployer
│   ├── m4_time_reconstruct/ ← HistoryReconstructor → FutureProjector → TimelineRenderer
│   ├── m5_intuition_engine/ ← BayesianReasoner → GapFiller → CrossModuleGlue → Explainer
│   └── m6_reality_sim/      ← WorldObserver → SimRunner → ResultsAnalyzer → CodeSynthesizer
├── api/                     ← FastAPI routes + WebSocket
├── database/                ← SQLAlchemy models + Alembic migrations
├── security/                ← JWT + password hash + rate limiter
├── tasks/                   ← Celery async tasks
└── frontend/                ← React + Vite + Tailwind UI
```

## API

```bash
# Start API server
uvicorn api.main:app --reload

# Or with Docker
docker-compose -f infra/docker-compose.yml up
```

Endpoints: `POST /api/v1/core/learn`, `/core/ask`, `/core/teach`, `/core/quiz`,
`/core/route`, `GET /core/stats`, WebSocket `/ws/stream`

## Running Tests

```bash
make test           # all tests
make test-unit      # unit only
make test-integration
```

## Environment Variables

Copy `.env.example` → `.env` and fill in:
- `HF_TOKEN` — HuggingFace API token (required)
- `DATABASE_URL` — SQLite (default) or PostgreSQL
- `REDIS_URL` — for Celery task queue
- `KG_PERSIST_DIR` — ChromaDB persistence directory

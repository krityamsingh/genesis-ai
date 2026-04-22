# GENESIS v3 — AI Platform

> A self-learning, multi-modal AI platform with a full Claude.ai-style interface.

## ✦ What's New in v3

### Frontend — Complete Claude.ai Clone
- **Warm design system** — Instrument Serif + DM Sans + JetBrains Mono, amber accent palette
- **Conversation sidebar** — grouped by Today/Yesterday/This Week, search, delete
- **Welcome screen** — personalized greeting + suggestion chips (like Claude)
- **Enhanced message bubbles** — inline markdown rendering, code blocks, copy button, thinking animation
- **Smart InputBar** — module selector dropdown, character counter, animated send
- **Sidebar collapse** — toggleable for more chat space
- **Toast notifications**, **skeleton loaders**, **modal system**

### Backend — 3 New Modules

| Module | Name | What it does |
|--------|------|-------------|
| M7 | **Multimodal Processor** | Analyze images (vision AI), transcribe audio (Whisper), extract PDFs/DOCX |
| M8 | **Agent Runner** | Autonomous multi-step agent with tool use, planning, and memory |
| M9 | **Code Interpreter** | Safe Python/Bash/SQL execution with stdout capture |

### New API Endpoints
```
POST /api/v1/multimodal/analyze        — Upload file for AI analysis
POST /api/v1/multimodal/analyze-b64    — Base64 content analysis
GET  /api/v1/multimodal/supported-types

POST /api/v1/agent/run                 — Start autonomous agent (SSE stream)
GET  /api/v1/agent/tools               — List available agent tools

POST /api/v1/interpret/execute         — Execute Python/Bash/SQL code
GET  /api/v1/interpret/languages       — List supported languages
```

### Infrastructure
- **Docker multi-stage build** — separate frontend build + slim Python API image
- **docker-compose.yml** — MongoDB, Redis, ChromaDB, Celery worker, dev frontend
- **Comprehensive .env.example** with all new variables documented

---

## Quick Start

### 1. Clone and configure
```bash
cp .env.example .env
# Fill in your API keys (at minimum: GOOGLE_API_KEY and MONGODB_URI)
```

### 2. Run with Docker Compose
```bash
docker-compose up
```
Open: http://localhost:8080

### 3. Development mode
```bash
# Terminal 1 — API
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```
Open: http://localhost:5173

---

## Architecture

```
genesis-v3/
├── api/v1/
│   ├── multimodal_routes.py    ← NEW: M7 file upload & analysis
│   ├── agent_routes.py         ← NEW: M8 SSE agent streaming
│   ├── interpreter_routes.py   ← NEW: M9 code execution
│   └── ... (existing routes)
│
├── modules/
│   ├── m7_multimodal/          ← NEW: image/audio/doc processing
│   │   ├── processor.py
│   │   ├── vision_analyzer.py
│   │   ├── audio_transcriber.py
│   │   └── doc_extractor.py
│   │
│   ├── m8_agent_runner/        ← NEW: autonomous agent
│   │   ├── agent.py
│   │   ├── planner.py
│   │   ├── tools.py
│   │   └── memory.py
│   │
│   └── m9_code_interpreter/    ← NEW: safe code execution
│       ├── interpreter.py
│       ├── sandbox.py
│       └── languages.py
│
└── frontend/src/
    ├── styles/design-system.css    ← UPGRADED: full token system
    ├── components/
    │   ├── Sidebar.jsx             ← UPGRADED: groups, search, collapse
    │   ├── Message.jsx             ← UPGRADED: markdown, copy, thinking
    │   └── InputBar.jsx            ← UPGRADED: module picker, char limit
    └── pages/
        ├── ChatApp.jsx             ← UPGRADED: welcome screen, streaming
        ├── LoginPage.jsx           ← UPGRADED: polished auth UI
        └── Dashboard.jsx           ← UPGRADED: stats + module health
```

---

## Module Quick Reference

### M7 — Multimodal
```python
from modules.m7_multimodal import MultimodalProcessor
p = MultimodalProcessor()
result = await p.process(image_bytes, "image/jpeg", prompt="What is in this image?")
# → {"type": "image", "result": "...", "summary": "...", "tokens_used": 42}
```

### M8 — Agent Runner
```python
from modules.m8_agent_runner import AgentRunner
runner = AgentRunner()
async for event in runner.run("Research the latest RAG papers and summarize"):
    print(event)
# → {"type": "plan", "steps": [...]}
# → {"type": "step", "tool": "web_search", "output": "..."}
# → {"type": "done", "result": "...", "elapsed": 4.2}
```

### M9 — Code Interpreter
```python
from modules.m9_code_interpreter import CodeInterpreter
interp = CodeInterpreter()
result = await interp.execute("print(2 ** 32)", "python")
# → {"stdout": "4294967296\n", "error": None, "elapsed": 0.012}
```

---

## Default Credentials
```
Admin:  admin / Genesis@2024!
```
Change immediately via `ADMIN_PASSWORD` in `.env`.

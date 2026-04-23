# GENESIS Changelog

## v3.0.0 — The Big Upgrade (2025)

### 🎨 Frontend — Complete Redesign (Claude.ai-inspired)

**Design System (`design-system.css`)**
- New warm amber/cream color palette (`--bg: #FAFAF8`, `--brand: #D97706`)
- Typography stack: Instrument Serif (display) + DM Sans (UI) + JetBrains Mono (code)
- Full CSS token system for colors, radii, shadows, transitions
- 8 new animations: `fadeIn`, `fadeInScale`, `slideInLeft`, `typing`, `shimmer`, `blink`, `spin`, `slideDown`
- New component classes: `.btn`, `.badge`, `.card`, `.input`, `.module-chip`, `.nav-item`, `.g-logo`
- Markdown prose styles via `.prose`
- Skeleton loaders, tooltip system, dropdown menus, modal backdrop
- Thinking animation (3-dot bounce) for streaming responses

**Sidebar (`Sidebar.jsx`)**
- Conversations grouped by: Today / Yesterday / This Week / Older
- Live search filter across all conversations
- Collapse/expand toggle with smooth CSS transition
- Module color badges on conversation items
- Active conversation indicator (left border stripe)
- Trained models section with domain color chips
- User avatar with initials fallback
- Navigation links with active state highlighting

**Message (`Message.jsx`)**
- Inline markdown rendering (headings, bold, italic, code, lists, blockquotes, tables)
- Syntax-highlighted code blocks with copy button
- Hover-reveal action toolbar (copy, timestamp)
- User messages: warm amber bubble (right-aligned)
- Assistant messages: left-aligned with Genesis avatar
- Thinking indicator: animated 3-dot bounce during streaming

**InputBar (`InputBar.jsx`)**
- Module selector dropdown with icons and descriptions
- Auto-expanding textarea (max 240px)
- Character counter (shows at 9500+ chars)
- Animated gradient send button with hover scale
- Spinning loader during AI response
- Keyboard hint footer
- Ctrl+Enter sends, Shift+Enter for newline

**ChatApp (`ChatApp.jsx`)**
- Welcome screen with personalized greeting + 6 suggestion chips
- Suggestion chips animate in with staggered delay
- TopBar with conversation title and module badge
- Sidebar collapse integration
- Loading skeleton for messages
- Auto-scroll to bottom on new messages

**LoginPage (`LoginPage.jsx`)**
- Google OAuth button with official icon
- Tab switcher: Email/Password ↔ Phone OTP
- OTP input with large centered monospace display
- Show/hide password toggle
- Animated error/success banners
- Loading spinners on all async actions

**New Pages**
- `NameSetupPage.jsx` — First-run name setup
- `Dashboard.jsx` — Stats cards + module health grid
- `CodeInterpreter.jsx` — Monaco-style editor with Python/Bash/SQL execution
- `AgentRunner.jsx` — Streaming agent step visualizer

### 🔧 Backend — 3 New Modules

**M7 Multimodal Processor** (`modules/m7_multimodal/`)
- `MultimodalProcessor` — Unified router for image/audio/document inputs
- `VisionAnalyzer` — Image analysis via Google Gemini, OpenAI GPT-4o, or Anthropic Claude
- `AudioTranscriber` — Audio transcription via OpenAI Whisper or local whisper
- `DocumentExtractor` — PDF (pypdf), DOCX (python-docx), plain text extraction

**M8 Agent Runner** (`modules/m8_agent_runner/`)
- `AgentRunner` — Orchestrates multi-step autonomous execution with SSE streaming
- `TaskPlanner` — LLM-based goal decomposition to ordered tool-use steps
- `ToolRegistry` — Register/retrieve/list agent tools
- 6 Built-in tools: `think`, `web_search`, `summarize`, `write`, `retrieve`, `code_exec`
- `AgentMemory` — In-session state tracking across tool executions

**M9 Code Interpreter** (`modules/m9_code_interpreter/`)
- `CodeInterpreter` — Unified execution entry point with timeout sandboxing
- `Sandbox` — asyncio-wrapped execution with `wait_for` timeout protection
- Python runner — Full stdlib, print capture, last-expression result
- Bash runner — subprocess with 8s timeout
- SQL runner — In-memory SQLite with table formatting
- `LanguageRegistry` — Extensible language-to-runner mapping

### 🌐 New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/multimodal/analyze` | File upload analysis (image/audio/doc) |
| POST | `/api/v1/multimodal/analyze-b64` | Base64 content analysis |
| GET | `/api/v1/multimodal/supported-types` | List supported MIME types |
| POST | `/api/v1/agent/run` | Start agent with SSE streaming |
| GET | `/api/v1/agent/tools` | List available agent tools |
| POST | `/api/v1/interpret/execute` | Execute Python/Bash/SQL code |
| GET | `/api/v1/interpret/languages` | List supported languages |

### 🛠 Services Layer

- `StreamingService` — Unified SSE streaming for Google/OpenAI/Anthropic providers
- `KnowledgeService` — ChromaDB vector store with search, ingestion, stats, and clear

### 🐳 Infrastructure

- Multi-stage Dockerfile (Node.js frontend build → slim Python API image)
- `docker-compose.yml` with MongoDB, Redis, ChromaDB, Celery worker, and dev frontend
- Health check configuration
- Non-root user setup for production security

### 📋 Requirements

- Python: Added `anthropic==0.51.0`, `openai==1.76.0`, `pypdf==5.4.0`, `python-docx>=1.1.2`, `structlog>=24.4.0`
- Node: Added `zustand ^4.5.5` for lightweight state management

### 🧪 Tests

- `tests/unit/test_m7_multimodal.py` — 7 unit tests for MultimodalProcessor and DocumentExtractor
- `tests/unit/test_m8_agent.py` — 9 unit tests for ToolRegistry, AgentMemory, and built-in tools
- `tests/unit/test_m9_interpreter.py` — 12 unit tests for Python/SQL runners and LanguageRegistry

---

## v2.0.0 — Previous Version

See original `genesis-ai-upgraded` repository.

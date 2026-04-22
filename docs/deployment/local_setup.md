# GENESIS — Local Development Setup

## Prerequisites

| Tool | Minimum Version | Install |
|---|---|---|
| Python | 3.11 | [python.org](https://python.org) |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| MongoDB | 7.0 | [mongodb.com](https://mongodb.com) or Atlas |
| Git | any | `apt install git` |

## Step-by-Step

### 1. Clone and configure

```bash
git clone https://github.com/your-org/genesis-ai.git
cd genesis-ai
cp .env .env.local
# Edit .env.local — add HF_TOKEN at minimum
```

### 2. Start MongoDB

**Option A — Docker (fastest):**
```bash
docker run -d --name mongo-genesis -p 27017:27017 mongo:7
```

**Option B — MongoDB Atlas (cloud, free tier):**
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free M0 cluster
3. Click "Connect" → copy connection string
4. Set in `.env`: `MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/`

### 3. Install Python dependencies

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Seed the database

```bash
python scripts/seed_data.py
# Creates: admin user (admin@genesis.ai / Genesis@2024!)
# Creates: 6 module states (all enabled by default)
```

### 5. Start the API server

```bash
uvicorn api.main:app --reload --port 8000
```

Visit: [http://localhost:8000/docs](http://localhost:8000/docs)

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: [http://localhost:5173](http://localhost:5173)

### 7. Start the admin panel (optional)

```bash
cd admin/frontend
npm install
npm run dev
# Admin panel: http://localhost:5174
```

## Environment Variables Quick Reference

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `HF_TOKEN` | ✅ | HuggingFace API token |
| `JWT_SECRET` | ✅ | Must be changed in production |
| `GOOGLE_CLIENT_ID` | Optional | For Google OAuth |
| `TWILIO_ACCOUNT_SID` | Optional | For SMS OTP |
| `OPENAI_API_KEY` | Optional | Fallback LLM |
| `ANTHROPIC_API_KEY` | Optional | Claude fallback |

## Useful Dev Commands

```bash
make test          # Run pytest
make lint          # ruff + mypy
make format        # black + ruff --fix
make seed          # Re-run DB seeds
make clean         # Clear caches
```

## Common Issues

**MongoDB connection refused:**
```
RuntimeError: MongoDB not connected
```
→ Check MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`

**HF_TOKEN errors:**
```
[ENGINE ERROR] 401 Unauthorized
```
→ Set `HF_TOKEN=hf_...` in `.env`. Get token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

**Port already in use:**
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

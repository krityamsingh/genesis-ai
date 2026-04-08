# Local Setup

```bash
# 1. Clone
git clone https://github.com/your-org/genesis-ai.git && cd genesis-ai

# 2. Install Python deps
pip install -r requirements.txt

# 3. Configure
cp .env.example .env
# Edit .env — add HF_TOKEN at minimum

# 4. Seed database
python scripts/seed_data.py

# 5. Start API
uvicorn api.main:app --reload --port 8000

# 6. Start frontend (in another terminal)
cd frontend && npm install && npm run dev
```

Visit: http://localhost:5173

# GENESIS — Cloud Deployment

## Railway (Recommended)

Railway is the primary deployment target — zero config for MongoDB add-on.

### Steps

1. Fork the repo on GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add MongoDB service: click **+ New** → **Database** → **MongoDB**
4. Set environment variables in Railway dashboard:
   ```
   HF_TOKEN=hf_...
   JWT_SECRET=<generate with: openssl rand -hex 32>
   ADMIN_PASSWORD=<strong-password>
   GOOGLE_CLIENT_ID=...   (optional)
   ```
5. Railway auto-detects `railway.toml` and deploys

Railway auto-assigns `MONGO_URL` when you add the MongoDB service.

### railway.toml

```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn api.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
```

---

## Vercel (Frontend only)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Set env var in Vercel dashboard:
```
VITE_API_URL=https://your-railway-app.railway.app
```

---

## Render

1. New Web Service → connect GitHub repo
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
4. Add MongoDB: use MongoDB Atlas free tier, paste connection string

---

## Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/genesis-ai

# Deploy
gcloud run deploy genesis-ai \
  --image gcr.io/PROJECT_ID/genesis-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGO_URL=...,HF_TOKEN=...,JWT_SECRET=...
```

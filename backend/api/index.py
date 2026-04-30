# api/index.py  ← Vercel serverless handler
# This file wraps the FastAPI app with Mangum so Vercel can run it as a Lambda function.

from mangum import Mangum
from api.main import app   # your existing FastAPI app

# Mangum adapts ASGI (FastAPI) to AWS Lambda / Vercel serverless format
handler = Mangum(app, lifespan="off")

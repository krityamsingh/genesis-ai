# API Overview

Base URL: `http://localhost:8000/api/v1`

## Authentication

All endpoints except `/health` require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Core Endpoints

| Method | Endpoint            | Description                      |
|--------|---------------------|----------------------------------|
| POST   | `/core/learn`       | Feed any source to M1            |
| POST   | `/core/ask`         | Ask a question from knowledge    |
| POST   | `/core/teach`       | Explain a topic                  |
| POST   | `/core/quiz`        | Generate a quiz                  |
| POST   | `/core/flashcards`  | Generate flashcards              |
| POST   | `/core/route`       | Auto-route to best module        |
| GET    | `/core/stats`       | System statistics                |
| WS     | `/ws/stream`        | Streaming WebSocket              |

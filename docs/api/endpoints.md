# API Endpoints Reference

## POST /core/learn

```json
{ "source": "https://example.com/article" }
```

Response:
```json
{
  "response": "📚 Learned from: ...",
  "knowledge_items_stored": 12,
  "domain": "machine learning",
  "difficulty": "intermediate"
}
```

## POST /core/ask

```json
{ "query": "What is backpropagation?" }
```

## POST /core/route

Routes automatically to the best module based on intent detection.

```json
{ "query": "Simulate a market crash scenario" }
```

Response includes `module`, `intent`, and `response` fields.

## WebSocket /ws/stream

Send JSON: `{ "action": "think", "payload": "your prompt" }`
Receive streaming text chunks, terminated by `[DONE]`.

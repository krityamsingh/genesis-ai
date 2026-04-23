# GENESIS WebSocket Streaming

GENESIS supports real-time streaming AI responses via WebSocket at `/ws/stream`.

## Connection

```javascript
const token = localStorage.getItem('genesis_token')
const ws = new WebSocket(`ws://localhost:8000/ws/stream?token=${token}`)

ws.onopen = () => {
  console.log('Connected to GENESIS stream')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)

  if (data.type === 'chunk') {
    // Append streaming text chunk
    document.getElementById('output').textContent += data.content
  }

  if (data.type === 'done') {
    console.log('Stream complete. Module:', data.module)
  }

  if (data.type === 'error') {
    console.error('Stream error:', data.message)
  }
}

ws.onerror = (err) => console.error('WebSocket error:', err)
ws.onclose = () => console.log('Disconnected')
```

## Sending a Query

```javascript
ws.send(JSON.stringify({
  query: "Explain self-attention in detail",
  module: "m1",         // optional — auto-routed if omitted
  temperature: 0.7,
  max_tokens: 1024,
  conversation_id: "65a1..."  // optional — saves to conversation history
}))
```

## Message Types

### Incoming (server → client)

| type | Fields | Description |
|---|---|---|
| `connected` | `session_id` | Sent immediately on connection |
| `chunk` | `content: str` | Streaming text fragment |
| `done` | `module, intent, confidence` | Stream complete |
| `error` | `message: str` | Error during generation |

### Outgoing (client → server)

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | ✅ | The user query |
| `module` | string | ❌ | Force specific module (m1-m6) |
| `temperature` | float | ❌ | 0.0–1.0, default 0.7 |
| `max_tokens` | int | ❌ | Max response length, default 1024 |
| `conversation_id` | string | ❌ | If set, message saved to history |

## React Hook Example

```javascript
import { useEffect, useRef, useState } from 'react'

export function useGenesisStream(token) {
  const wsRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [output, setOutput] = useState('')

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/stream?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'chunk') {
        setOutput(prev => prev + data.content)
      }
      if (data.type === 'done') {
        setStreaming(false)
      }
    }

    return () => ws.close()
  }, [token])

  const send = (query, module = null) => {
    setOutput('')
    setStreaming(true)
    wsRef.current?.send(JSON.stringify({ query, module }))
  }

  return { send, output, streaming }
}
```

## Authentication

The WebSocket endpoint accepts the JWT token as a query parameter:

```
ws://localhost:8000/ws/stream?token=eyJ...
```

Unauthenticated connections are closed immediately with code `4001`.

## Error Codes

| Code | Meaning |
|---|---|
| `4001` | Missing or invalid token |
| `4002` | Token expired |
| `4003` | User deactivated |
| `4004` | Rate limit exceeded |

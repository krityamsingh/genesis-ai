# WebSocket API

## Endpoint: /ws/stream

### Connect

```js
const ws = new WebSocket('ws://localhost:8000/ws/stream')
```

### Actions

**Stream a text generation:**
```js
ws.send(JSON.stringify({ action: 'think', payload: 'Explain quantum entanglement' }))
// Receive chunks then [DONE]
```

**Learn from a source:**
```js
ws.send(JSON.stringify({ action: 'learn', payload: 'https://arxiv.org/abs/1706.03762' }))
// Receive JSON result
```

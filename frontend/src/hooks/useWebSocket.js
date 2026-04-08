// frontend/src/hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/stream'

export function useWebSocket() {
  const ws      = useRef(null)
  const [connected, setConnected]   = useState(false)
  const [streaming, setStreaming]   = useState(false)
  const [buffer,    setBuffer]      = useState('')

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return
    ws.current = new WebSocket(WS_URL)
    ws.current.onopen  = () => setConnected(true)
    ws.current.onclose = () => { setConnected(false); setStreaming(false) }
    ws.current.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setStreaming(false)
      } else {
        setBuffer((b) => b + e.data)
      }
    }
  }, [])

  const send = useCallback((action, payload) => {
    if (!connected) connect()
    setBuffer('')
    setStreaming(true)
    ws.current?.send(JSON.stringify({ action, payload }))
  }, [connected, connect])

  const streamThink = useCallback((prompt) => send('think', prompt), [send])
  const streamLearn = useCallback((source) => send('learn', source),  [send])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return { connected, streaming, buffer, streamThink, streamLearn }
}

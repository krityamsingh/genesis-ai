// ── hooks/useWebSocket.js ──────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/chat'

export default function useWebSocket() {
  const [lastToken,    setLastToken]    = useState(null)
  const [isConnected,  setIsConnected]  = useState(false)
  const wsRef = useRef(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('genesis_token')
    if (!token) return

    try {
      const ws = new WebSocket(`${WS_URL}?token=${token}`)

      ws.onopen = () => {
        setIsConnected(true)
        wsRef.current = ws
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'token') {
            setLastToken(data.token)
          } else if (data.type === 'done') {
            setLastToken('[DONE]')
          } else if (data.type === 'error') {
            console.error('WS error from server:', data.message)
            setLastToken('[DONE]')
          }
        } catch {
          // Raw text token (fallback)
          setLastToken(e.data)
        }
      }

      ws.onerror = () => setIsConnected(false)
      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
        // Reconnect after 3s
        setTimeout(connect, 3000)
      }
    } catch (err) {
      console.error('WebSocket connection failed:', err)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback(({ message, module = 'auto' }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected')
      return
    }
    wsRef.current.send(JSON.stringify({ message, module }))
  }, [])

  return { sendMessage, lastToken, isConnected }
}

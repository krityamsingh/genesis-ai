// ── hooks/useWebSocket.js (UPGRADED) ──────────────────────────────────────────
// Bug fixes:
//   • WS URL fallback now uses /ws/stream (was /ws/chat — backend never registered that)
// New (Section D):
//   • onModuleAdded callback — fired when backend broadcasts "module_added" event
//     Training completion auto-triggers this, sidebar refreshes without reload
//
import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stream'

export default function useWebSocket({ onModuleAdded } = {}) {
  const [lastToken,   setLastToken]   = useState(null)
  const [isConnected, setIsConnected] = useState(false)
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
        // Section D: handle server-push events from broadcast_to_all()
        try {
          const data = JSON.parse(e.data)

          if (data.type === 'module_added') {
            // New trained model is ready — notify caller (Sidebar refreshes)
            if (onModuleAdded) onModuleAdded(data)
            return
          }
          if (data.type === 'token') {
            setLastToken(data.token)
          } else if (data.type === 'done') {
            setLastToken('[DONE]')
          } else if (data.type === 'error') {
            console.error('WS error from server:', data.message)
            setLastToken('[DONE]')
          }
        } catch {
          // Raw text chunk (streaming fallback)
          setLastToken(e.data)
        }
      }

      ws.onerror = () => setIsConnected(false)
      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
        setTimeout(connect, 3000)   // auto-reconnect
      }
    } catch (err) {
      console.error('WebSocket connection failed:', err)
    }
  }, [onModuleAdded])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])

  const sendMessage = useCallback(({ action = 'think', payload }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected')
      return
    }
    wsRef.current.send(JSON.stringify({ action, payload }))
  }, [])

  return { sendMessage, lastToken, isConnected }
}

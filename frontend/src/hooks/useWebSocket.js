import { useEffect, useRef, useCallback } from 'react'
import useGenesisStore from '../store/genesisStore'

/**
 * useWebSocket
 *
 * Connects to the GENESIS /ws/stream WebSocket endpoint.
 * Streams tokens into the store's streamText field while streaming=true,
 * then finalises into the messages array.
 *
 * Usage:
 *   const { sendQuery } = useWebSocket()
 *   sendQuery('What is self-attention?', 'auto')
 */
export function useWebSocket() {
  const wsRef = useRef(null)
  const pingRef = useRef(null)
  const {
    token,
    addMessage,
    setStreamText,
    setStreaming,
    streamText,
    chatModule,
  } = useGenesisStore()

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}/ws/stream`
    const ws    = new WebSocket(url)

    ws.onopen = () => {
      // Authenticate immediately after connect
      ws.send(JSON.stringify({ type: 'auth', token }))
      // Keepalive ping every 25 s
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, 25_000)
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      switch (msg.type) {
        case 'token':
          // Append streamed token
          setStreamText(useGenesisStore.getState().streamText + msg.content)
          break

        case 'done': {
          // Finalise
          const full = useGenesisStore.getState().streamText
          addMessage({ role: 'assistant', content: full, module: msg.module || chatModule })
          setStreamText('')
          setStreaming(false)
          break
        }

        case 'error':
          addMessage({ role: 'system', content: `⚠ ${msg.detail || 'Stream error'}` })
          setStreamText('')
          setStreaming(false)
          break

        case 'pong':
          break

        default:
          break
      }
    }

    ws.onerror = () => {
      setStreamText('')
      setStreaming(false)
    }

    ws.onclose = () => {
      clearInterval(pingRef.current)
      wsRef.current = null
      // Reconnect after 3 s if authed
      if (useGenesisStore.getState().authed) {
        setTimeout(connect, 3_000)
      }
    }

    wsRef.current = ws
  }, [token]) // eslint-disable-line

  useEffect(() => {
    if (token) connect()
    return () => {
      clearInterval(pingRef.current)
      wsRef.current?.close()
    }
  }, [token, connect])

  // ── Send query ────────────────────────────────────────────────────────────
  const sendQuery = useCallback((query, module_hint = 'auto') => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Fallback: mark stream ended so UI doesn't hang
      setStreaming(false)
      addMessage({ role: 'system', content: '⚠ WebSocket not connected. Retrying...' })
      connect()
      return
    }
    setStreaming(true)
    setStreamText('')
    ws.send(JSON.stringify({ type: 'query', query, module_hint }))
  }, [connect, addMessage, setStreaming, setStreamText])

  return { sendQuery, connected: wsRef.current?.readyState === WebSocket.OPEN }
}

export default useWebSocket

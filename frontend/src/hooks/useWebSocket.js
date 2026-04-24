// useWebSocket.js — WS hook with reconnect + typing + ping/pong (Phase 5)
import { useCallback, useEffect, useRef, useState } from "react";
export function useWebSocket({ url, token, onMessage }) {
  const ws = useRef(null); const timer = useRef(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping]       = useState(false);
  const connect = useCallback(() => {
    const u = token ? `${url}?token=${token}` : url;
    const s = new WebSocket(u); ws.current = s;
    s.onopen  = () => setConnected(true);
    s.onclose = () => { setConnected(false); timer.current = setTimeout(connect, 3000); };
    s.onerror = () => s.close();
    s.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.event==="typing_start") { setTyping(true); return; }
        if (d.event==="typing_stop")  { setTyping(false); return; }
        if (d.event==="ping")         { s.send(JSON.stringify({event:"pong"})); return; }
        onMessage?.(d);
      } catch {}
    };
  }, [url, token, onMessage]);
  useEffect(() => { connect(); return () => { ws.current?.close(); clearTimeout(timer.current); }; }, [connect]);
  const send = useCallback(query => {
    if (ws.current?.readyState === WebSocket.OPEN)
      ws.current.send(JSON.stringify({event:"message",query}));
  }, []);
  return { connected, typing, send };
}

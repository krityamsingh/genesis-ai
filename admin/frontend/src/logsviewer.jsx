import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

function lineColor(line) {
  if (/ERROR|CRITICAL|error|critical/i.test(line)) return '#ff6060'
  if (/WARN|warning/i.test(line))  return '#ffcc00'
  if (/INFO|info/i.test(line))     return '#8ab0cc'
  if (/DEBUG/i.test(line))         return '#4a6080'
  return '#6a8aa0'
}

export default function LogsViewer({ token }) {
  const [lines,   setLines]   = useState([])
  const [n,       setN]       = useState(100)
  const [loading, setLoading] = useState(false)
  const [auto,    setAuto]    = useState(true)
  const [filter,  setFilter]  = useState('')
  const bottom = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/v1/admin/logs?n=${n}`, api(token))
      setLines(data.lines || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [token, n])

  useEffect(() => {
    load()
    if (!auto) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load, auto])

  useEffect(() => {
    if (auto) bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, auto])

  const displayed = filter
    ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
    : lines

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter logs…"
          style={{
            flex: 1, minWidth: 180,
            background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
            borderRadius: 3, padding: '7px 12px', color: '#e0f0ff', fontSize: 12,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <select value={n} onChange={e => setN(+e.target.value)} style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 3, padding: '7px 10px', color: '#8ab0cc', fontSize: 11,
          fontFamily: 'inherit',
        }}>
          {[50,100,200,500].map(v => <option key={v} value={v}>{v} lines</option>)}
        </select>
        <button onClick={() => setAuto(!auto)} style={{
          background: auto ? 'rgba(0,255,150,0.08)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${auto ? 'rgba(0,255,150,0.25)' : 'rgba(0,245,255,0.12)'}`,
          borderRadius: 3, color: auto ? '#00ff96' : '#4a6080', fontSize: 10,
          padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
        }}>
          {auto ? '⏸ LIVE' : '▶ LIVE'}
        </button>
        <button onClick={load} style={{
          background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 3, color: '#00f5ff', fontSize: 10,
          padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
        }}>↺ REFRESH</button>
      </div>

      {/* Log terminal */}
      <div style={{
        background: '#020810',
        border: '1px solid rgba(0,245,255,0.1)',
        borderRadius: 4, overflow: 'auto',
        height: 480, padding: '16px 20px',
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
      }}>
        {loading && lines.length === 0 ? (
          <div style={{ color: '#4a6080', fontSize: 12 }}>≡ LOADING LOGS…</div>
        ) : displayed.length === 0 ? (
          <div style={{ color: '#3d5a72', fontSize: 12 }}>No log lines {filter ? 'matching filter' : 'found'}.</div>
        ) : displayed.map((line, i) => (
          <div key={i} style={{
            fontSize: 11, lineHeight: 1.7, color: lineColor(line),
            borderBottom: i < displayed.length - 1 ? '1px solid rgba(0,245,255,0.02)' : 'none',
            padding: '1px 0', wordBreak: 'break-all',
          }}>
            {line}
          </div>
        ))}
        <div ref={bottom}/>
      </div>
      <div style={{ fontSize: 10, color: '#2a4a60', letterSpacing: 1 }}>
        {displayed.length} / {lines.length} LINES · {auto ? 'AUTO-REFRESH 5s' : 'PAUSED'}
      </div>
    </div>
  )
}

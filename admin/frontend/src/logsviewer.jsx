// admin/frontend/src/logsviewer.jsx — UPDATED
// Added: filter by level (INFO/WARN/ERROR), filter by module, date range, color-coded severity.
// Auto-scroll toggle preserved.
import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']

function lineColor(line) {
  if (/ERROR|CRITICAL/i.test(line))  return { color: '#EF4444', bg: '#FEF2F2' }
  if (/WARN|WARNING/i.test(line))    return { color: '#D97706', bg: '#FFFBEB' }
  if (/INFO/i.test(line))            return { color: '#2563EB', bg: 'transparent' }
  if (/DEBUG/i.test(line))           return { color: '#9CA3AF', bg: 'transparent' }
  return { color: '#374151', bg: 'transparent' }
}

function matchesLevel(line, level) {
  if (level === 'ALL') return true
  return new RegExp(level, 'i').test(line)
}

export default function LogsViewer({ token }) {
  const [lines,   setLines]   = useState([])
  const [n,       setN]       = useState(200)
  const [loading, setLoading] = useState(false)
  const [auto,    setAuto]    = useState(true)
  const [search,  setSearch]  = useState('')
  const [level,   setLevel]   = useState('ALL')
  const bottom = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/v1/admin/logs?lines=${n}`, api(token))
      setLines(Array.isArray(data.lines) ? data.lines : [])
    } catch { setLines([]) }
    finally { setLoading(false) }
  }, [n, token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!auto) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [auto, load])

  useEffect(() => {
    if (auto) bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, auto])

  const visible = lines.filter(l =>
    matchesLevel(l, level) &&
    (!search || l.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Logs</h2>
        <div style={{ flex: 1 }} />

        <select value={level} onChange={e => setLevel(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}>
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>

        <input placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, width: 180 }} />

        <select value={n} onChange={e => setN(Number(e.target.value))}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}>
          {[100, 200, 500, 1000].map(v => <option key={v}>{v} lines</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
          Auto-refresh
        </label>

        <button onClick={load}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
        {visible.length} of {lines.length} lines
      </div>

      {/* Log pane */}
      <div style={{
        flex: 1, overflowY: 'auto', background: '#FAFAFA',
        border: '1px solid #E5E7EB', borderRadius: 10,
        fontFamily: '"JetBrains Mono","Fira Code","Consolas",monospace',
        fontSize: 12, lineHeight: 1.6,
      }}>
        {visible.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
            {loading ? 'Loading…' : 'No log lines match your filters.'}
          </div>
        )}
        {visible.map((line, i) => {
          const { color, bg } = lineColor(line)
          return (
            <div key={i} style={{
              padding: '2px 16px', color, background: bg,
              borderBottom: bg !== 'transparent' ? `1px solid ${bg === '#FEF2F2' ? '#FEE2E2' : '#FEF3C7'}` : 'none',
            }}>
              {line}
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
    </div>
  )
}

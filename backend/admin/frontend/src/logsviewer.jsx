// logsviewer.jsx — System logs with level filter, search, auto-scroll
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { C, F, card, btn, input, apiHeaders } from './design'

const LEVEL_COLORS = {
  ERROR:   { bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
  WARN:    { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  WARNING: { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  INFO:    { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  DEBUG:   { bg: '#F0FDF4', color: '#15803D', dot: '#10B981' },
}

function parseLevel(line) {
  const upper = line.toUpperCase()
  if (upper.includes('[ERROR]') || upper.includes('ERROR:')) return 'ERROR'
  if (upper.includes('[WARN]')  || upper.includes('WARNING')) return 'WARN'
  if (upper.includes('[DEBUG]') || upper.includes('DEBUG:')) return 'DEBUG'
  return 'INFO'
}

function parseModule(line) {
  const m = line.match(/\[(m[1-6]|core|auth|admin|database)\]/i)
  return m ? m[1].toUpperCase() : null
}

function LogLine({ line, search, showTimestamp }) {
  const level = parseLevel(line)
  const mod   = parseModule(line)
  const style = LEVEL_COLORS[level] || LEVEL_COLORS.INFO

  // Highlight search term
  const highlight = (text) => {
    if (!search) return text
    const idx = text.toLowerCase().indexOf(search.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#FEF08A', padding: 0 }}>{text.slice(idx, idx + search.length)}</mark>
        {text.slice(idx + search.length)}
      </>
    )
  }

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '4px 12px',
      borderLeft: `3px solid ${style.dot}`,
      background: level === 'ERROR' ? '#FFF5F5' : 'transparent',
      fontFamily: F.mono, fontSize: 12, lineHeight: 1.6,
      borderBottom: '1px solid #F1F5F9',
    }}>
      <span style={{
        flexShrink: 0, padding: '1px 5px', borderRadius: 3,
        background: style.bg, color: style.color,
        fontSize: 9, fontWeight: 700, alignSelf: 'flex-start', marginTop: 2,
        letterSpacing: '0.04em', minWidth: 38, textAlign: 'center',
      }}>
        {level.slice(0, 4)}
      </span>
      {mod && (
        <span style={{
          flexShrink: 0, padding: '1px 5px', borderRadius: 3,
          background: '#F0F7FF', color: C.blue,
          fontSize: 9, fontWeight: 700, alignSelf: 'flex-start', marginTop: 2,
        }}>{mod}</span>
      )}
      <span style={{ flex: 1, color: level === 'ERROR' ? '#991B1B' : level === 'WARN' ? '#78350F' : C.textPrimary, wordBreak: 'break-all' }}>
        {highlight(line)}
      </span>
    </div>
  )
}

export default function LogsViewer({ token, toast }) {
  const [rawLines, setRawLines] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [lines,    setLines]    = useState(500)
  const [search,   setSearch]   = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [autoScroll, setAutoScroll]   = useState(true)
  const [lastFetch,  setLastFetch]    = useState(null)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/v1/admin/logs?lines=${lines}`, apiHeaders(token))
      const raw = typeof data === 'string' ? data : (data.logs || data.content || '')
      const parsed = raw.split('\n').filter(Boolean)
      setRawLines(parsed)
      setLastFetch(new Date())
    } catch { toast?.('Failed to load logs', 'error') }
    finally { setLoading(false) }
  }, [token, lines])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [rawLines, autoScroll])

  const filtered = rawLines.filter(line => {
    if (levelFilter !== 'ALL') {
      const lvl = parseLevel(line)
      if (lvl !== levelFilter && !(levelFilter === 'WARN' && lvl === 'WARNING')) return false
    }
    if (search && !line.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const errorCount = rawLines.filter(l => parseLevel(l) === 'ERROR').length
  const warnCount  = rawLines.filter(l => ['WARN', 'WARNING'].includes(parseLevel(l))).length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 200ms ease' }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Total Lines', value: rawLines.length, color: C.textSecondary },
          { label: 'Errors',      value: errorCount,      color: errorCount > 0 ? '#B91C1C' : C.textSecondary },
          { label: 'Warnings',    value: warnCount,       color: warnCount > 0  ? '#78350F' : C.textSecondary },
          { label: 'Showing',     value: filtered.length, color: C.blue },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            ...card({ padding: '10px 16px', flex: 1 }),
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{
        ...card({ padding: '12px 14px' }),
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none', fontSize: 13 }}>⌕</span>
          <input
            placeholder="Search logs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...input(), paddingLeft: 30, fontSize: 13 }}
          />
        </div>

        {/* Level filter buttons */}
        <div style={{ display: 'flex', gap: 4, background: C.bgMuted, borderRadius: 8, padding: 3 }}>
          {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map(lv => {
            const s = LEVEL_COLORS[lv === 'ALL' ? 'INFO' : lv] || LEVEL_COLORS.INFO
            return (
              <button key={lv} onClick={() => setLevelFilter(lv)} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: levelFilter === lv ? (lv === 'ALL' ? C.bgCard : s.bg) : 'transparent',
                color: levelFilter === lv ? (lv === 'ALL' ? C.textPrimary : s.color) : C.textSecondary,
                fontSize: 11, fontWeight: levelFilter === lv ? 700 : 400,
                cursor: 'pointer',
                boxShadow: levelFilter === lv ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>{lv}</button>
            )
          })}
        </div>

        {/* Lines selector */}
        <select
          value={lines}
          onChange={e => setLines(Number(e.target.value))}
          style={{ ...input(), width: 120, fontSize: 13, appearance: 'none', cursor: 'pointer' }}
        >
          {[100, 200, 500, 1000, 2000].map(n => (
            <option key={n} value={n}>{n} lines</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: C.textSecondary }}>
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>

        <button onClick={load} disabled={loading} style={{ ...btn('primary'), fontSize: 13 }}>
          {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Loading…</> : '↺ Refresh'}
        </button>
      </div>

      {/* Log viewer */}
      <div
        ref={containerRef}
        style={{
          ...card(),
          overflow: 'auto',
          height: 'calc(100vh - 380px)',
          minHeight: 300,
          background: '#FAFBFC',
        }}
      >
        {loading && rawLines.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>Loading logs…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
            {search || levelFilter !== 'ALL' ? 'No log lines match your filters.' : 'No log data available.'}
          </div>
        )}
        {filtered.map((line, i) => (
          <LogLine key={i} line={line} search={search} />
        ))}
        <div ref={bottomRef} />
      </div>

      {lastFetch && (
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
          Last refreshed: {lastFetch.toLocaleTimeString()} · {filtered.length} lines shown of {rawLines.length} total
        </div>
      )}
    </div>
  )
}

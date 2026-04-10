import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function PromptEditor({ token }) {
  const [prompts,  setPrompts]  = useState([])
  const [n,        setN]        = useState(50)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')
  const [clearing, setClearing] = useState(false)
  const [msg,      setMsg]      = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/v1/admin/prompts?n=${n}`, api(token))
      // data may be array or {prompts: [...]}
      setPrompts(Array.isArray(data) ? data : (data.prompts || []))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token, n])

  const clear = async () => {
    if (!confirm('Clear all prompt logs?')) return
    setClearing(true); setMsg('')
    try {
      await axios.delete('/api/v1/admin/prompts', api(token))
      setMsg('✓ Prompt logs cleared')
      setPrompts([])
    } catch(e) {
      setMsg('⚠ ' + (e.response?.data?.detail || 'Failed'))
    } finally { setClearing(false) }
  }

  const displayed = filter
    ? prompts.filter(p => {
        const text = typeof p === 'string' ? p : JSON.stringify(p)
        return text.toLowerCase().includes(filter.toLowerCase())
      })
    : prompts

  const getText = (p) => typeof p === 'string' ? p : (p.prompt || p.text || p.query || JSON.stringify(p))
  const getMeta  = (p) => typeof p === 'object'
    ? [p.module, p.timestamp ? new Date(p.timestamp * 1000).toLocaleString() : p.time].filter(Boolean).join(' · ')
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Search prompts…"
          style={{
            flex: 1, minWidth: 200,
            background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
            borderRadius: 3, padding: '7px 12px', color: '#e0f0ff', fontSize: 12,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <select value={n} onChange={e => setN(+e.target.value)} style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 3, padding: '7px 10px', color: '#8ab0cc', fontSize: 11, fontFamily: 'inherit',
        }}>
          {[25,50,100,200].map(v => <option key={v} value={v}>{v} recent</option>)}
        </select>
        <button onClick={load} style={{
          background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 3, color: '#00f5ff', fontSize: 10,
          padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
        }}>↺ RELOAD</button>
        <button onClick={clear} disabled={clearing || prompts.length === 0} style={{
          background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.2)',
          borderRadius: 3, color: '#ff6060', fontSize: 10,
          padding: '7px 14px', cursor: (clearing || prompts.length === 0) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', letterSpacing: 1, opacity: prompts.length === 0 ? 0.4 : 1,
        }}>
          {clearing ? 'CLEARING…' : '✕ CLEAR ALL'}
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '8px 14px', borderRadius: 3, fontSize: 12,
          background: msg.startsWith('✓') ? 'rgba(0,255,150,0.06)' : 'rgba(255,80,80,0.06)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(0,255,150,0.2)' : 'rgba(255,80,80,0.2)'}`,
          color: msg.startsWith('✓') ? '#00ff96' : '#ff6060',
        }}>{msg}</div>
      )}

      <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 1 }}>
        {displayed.length} / {prompts.length} ENTRIES
      </div>

      {/* Prompt list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        maxHeight: 520, overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ color: '#4a6080', fontSize: 12, padding: 12 }}>Loading prompts…</div>
        ) : displayed.length === 0 ? (
          <div style={{
            padding: 28, textAlign: 'center', color: '#3d5a72', fontSize: 12,
            border: '1px dashed rgba(0,245,255,0.08)', borderRadius: 4,
          }}>
            {filter ? 'No prompts match your filter.' : 'No prompt logs found.'}
          </div>
        ) : displayed.map((p, i) => {
          const text = getText(p)
          const meta = getMeta(p)
          const isOpen = expanded === i
          return (
            <div key={i}
              onClick={() => setExpanded(isOpen ? null : i)}
              style={{
                background: isOpen ? 'rgba(0,245,255,0.06)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${isOpen ? 'rgba(0,245,255,0.2)' : 'rgba(0,245,255,0.08)'}`,
                borderRadius: 3, padding: '10px 16px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  fontSize: 12, color: '#c0d8ee',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: isOpen ? 'pre-wrap' : 'nowrap',
                  flex: 1,
                }}>
                  {text}
                </div>
                <span style={{ color: '#2a4a60', fontSize: 12, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {meta && (
                <div style={{ fontSize: 10, color: '#3d5a72', marginTop: 4 }}>{meta}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

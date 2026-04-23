// PromptEditor.jsx — View, edit, save, delete prompt logs
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { C, F, card, btn, input, th, td, apiHeaders, fmtDate } from './design'

export default function PromptEditor({ token, toast }) {
  const [prompts,  setPrompts]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(null)  // { id, body }
  const [search,   setSearch]   = useState('')
  const [limit,    setLimit]    = useState(50)
  const [saving,   setSaving]   = useState(false)
  const [clearing, setClearing] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/v1/admin/prompts?n=${limit}`, apiHeaders(token))
      setPrompts(Array.isArray(data) ? data : data?.prompts || [])
    } catch { toast?.('Failed to load prompts', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [limit]) // eslint-disable-line

  const save = async (id) => {
    setSaving(true)
    try {
      await axios.put(`/api/v1/admin/prompts/${id}`, { body: editing.body }, apiHeaders(token))
      toast?.('Prompt saved', 'success')
      setEditing(null); load()
    } catch { toast?.('Failed to save prompt', 'error') }
    finally { setSaving(false) }
  }

  const clearAll = async () => {
    if (!window.confirm('Clear ALL prompt logs? This cannot be undone.')) return
    setClearing(true)
    try {
      await axios.delete('/api/v1/admin/prompts', apiHeaders(token))
      toast?.('All prompts cleared', 'success'); setPrompts([])
    } catch { toast?.('Failed to clear prompts', 'error') }
    finally { setClearing(false) }
  }

  const visible = prompts.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.prompt || p.body || '').toLowerCase().includes(q)
        || (p.module || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 200ms ease' }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none' }}>⌕</span>
          <input placeholder="Search prompts…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...input(), paddingLeft: 30, fontSize: 13 }} />
        </div>
        <select value={limit} onChange={e => setLimit(+e.target.value)}
          style={{ ...input(), width: 120, fontSize: 13, appearance: 'none' }}>
          {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} prompts</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={load} style={{ ...btn('default'), fontSize: 13 }}>↺ Refresh</button>
        <button onClick={clearAll} disabled={clearing} style={{ ...btn('danger'), fontSize: 13, opacity: clearing ? 0.6 : 1 }}>
          {clearing ? 'Clearing…' : '🗑 Clear All'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 12, color: C.textSecondary }}>
        {visible.length} of {prompts.length} prompts shown
      </div>

      {/* Prompt list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ ...card({ padding: 24 }), textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
            Loading prompts…
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div style={{ ...card({ padding: 32 }), textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
            {search ? `No prompts match "${search}"` : 'No prompt logs found.'}
          </div>
        )}
        {visible.map(p => {
          const id     = p.id || p._id || ''
          const isOpen = expanded === id
          const isEdit = editing?.id === id
          const text   = p.prompt || p.body || ''
          const resp   = p.response || ''

          return (
            <div key={id} style={card()}>
              {/* Header */}
              <div
                onClick={() => !isEdit && setExpanded(isOpen ? null : id)}
                style={{
                  padding: '12px 16px',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  cursor: isEdit ? 'default' : 'pointer',
                  borderBottom: isOpen ? `1px solid ${C.border}` : 'none',
                }}
              >
                {/* Module badge */}
                {p.module && (
                  <span style={{
                    flexShrink: 0, padding: '1px 7px', borderRadius: 4,
                    background: C.blueLight, color: C.blue,
                    fontSize: 10, fontWeight: 700, marginTop: 1,
                  }}>{p.module}</span>
                )}

                {/* Preview */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: C.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    lineHeight: 1.5,
                  }}>
                    {text.substring(0, 200)}{text.length > 200 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, display: 'flex', gap: 12 }}>
                    {p.created_at && <span>{fmtDate(p.created_at)}</span>}
                    {p.latency_ms != null && <span style={{ fontFamily: F.mono }}>{p.latency_ms}ms</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditing(editing?.id === id ? null : { id, body: text })}
                    style={{ ...btn(isEdit ? 'default' : 'ghost'), padding: '4px 10px', fontSize: 11 }}>
                    {isEdit ? '✕' : '✎ Edit'}
                  </button>
                </div>

                <span style={{ fontSize: 11, color: C.textMuted, transition: 'transform 200ms', transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', flexShrink: 0, marginTop: 2 }}>▾</span>
              </div>

              {/* Expanded / edit view */}
              {(isOpen || isEdit) && (
                <div style={{ padding: '14px 16px', background: '#FAFBFC' }}>
                  {isEdit ? (
                    <>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Edit Prompt</label>
                      <textarea
                        value={editing.body}
                        onChange={e => setEditing(p => ({ ...p, body: e.target.value }))}
                        rows={8}
                        style={{
                          ...input(), fontSize: 12, fontFamily: F.mono,
                          resize: 'vertical', lineHeight: 1.6,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => save(id)} disabled={saving}
                          style={{ ...btn('primary'), fontSize: 13 }}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)} style={{ ...btn('default'), fontSize: 13 }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Prompt</div>
                        <pre style={{ fontSize: 12, fontFamily: F.mono, color: C.textPrimary, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6 }}>{text}</pre>
                      </div>
                      {resp && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Response</div>
                          <pre style={{ fontSize: 12, fontFamily: F.mono, color: C.textSecondary, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6 }}>{resp.substring(0, 1000)}{resp.length > 1000 ? '\n…[truncated]' : ''}</pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

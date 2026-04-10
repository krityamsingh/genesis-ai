import React, { useState, useRef } from 'react'
import axios from 'axios'

const MODULES = [
  { key: 'auto',  label: 'Auto-route' },
  { key: 'm1',    label: 'M1 · Self-Learner' },
  { key: 'm2',    label: 'M2 · Research Accel' },
  { key: 'm3',    label: 'M3 · AI Builder' },
  { key: 'm4',    label: 'M4 · Time Reconstruct' },
  { key: 'm5',    label: 'M5 · Intuition Engine' },
  { key: 'm6',    label: 'M6 · Reality Sim' },
]

const ACTIONS = [
  { key: 'route',      label: 'Ask / Route',   endpoint: '/api/v1/core/route',   body: (q) => ({ query: q }) },
  { key: 'ask',        label: 'Ask M1',        endpoint: '/api/v1/core/ask',     body: (q) => ({ query: q }) },
  { key: 'teach',      label: 'Teach',         endpoint: '/api/v1/core/teach',   body: (q) => ({ query: q, level: 'intermediate' }) },
  { key: 'quiz',       label: 'Quiz',          endpoint: '/api/v1/core/quiz',    body: (q) => ({ query: q, n: 3, show_answers: true }) },
  { key: 'flashcards', label: 'Flashcards',    endpoint: '/api/v1/core/flashcards', body: (q) => ({ query: q, n: 5 }) },
  { key: 'learn',      label: 'Learn Source',  endpoint: '/api/v1/core/learn',   body: (q) => ({ source: q }) },
]

function prettyResponse(data) {
  if (typeof data === 'string') return data
  if (data.result)    return data.result
  if (data.response)  return typeof data.response === 'string' ? data.response : JSON.stringify(data.response, null, 2)
  return JSON.stringify(data, null, 2)
}

export default function PromptPlayground() {
  const [prompt,   setPrompt]   = useState('')
  const [action,   setAction]   = useState('route')
  const [response, setResponse] = useState('')
  const [meta,     setMeta]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [history,  setHistory]  = useState([])
  const taRef = useRef(null)

  const run = async () => {
    if (!prompt.trim()) return
    setLoading(true); setResponse(''); setMeta(null)
    const act = ACTIONS.find(a => a.key === action)
    try {
      const { data } = await axios.post(act.endpoint, act.body(prompt))
      const text = prettyResponse(data)
      setResponse(text)
      setMeta(data.module ? { module: data.module, intent: data.intent } : null)
      setHistory(prev => [{ prompt, action, text, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)])
    } catch(e) {
      setResponse(`⚠ Error: ${e.response?.data?.detail || e.message}`)
    } finally { setLoading(false) }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          ▶ Prompt Playground
        </div>
        <div style={{ fontSize: 11, color: '#3d5a72' }}>
          Route prompts through GENESIS modules · Ctrl+Enter to run
        </div>
      </div>

      {/* Action selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ACTIONS.map(a => (
          <button key={a.key} onClick={() => setAction(a.key)} style={{
            padding: '6px 14px', borderRadius: 20,
            background: action === a.key ? 'rgba(0,245,255,0.15)' : 'rgba(0,0,0,0.4)',
            border: `1px solid ${action === a.key ? 'rgba(0,245,255,0.4)' : 'rgba(0,245,255,0.1)'}`,
            color: action === a.key ? '#00f5ff' : '#4a6080',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={taRef}
          rows={6} value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={onKey}
          placeholder={action === 'learn'
            ? 'Enter a URL, file path, or raw text to ingest…'
            : 'Enter your prompt… (Ctrl+Enter to run)'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(0,245,255,0.15)',
            borderRadius: 4, padding: '16px 18px',
            color: '#e0f0ff', fontSize: 13, lineHeight: 1.7,
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            resize: 'vertical', outline: 'none',
          }}
        />
        <button
          onClick={run}
          disabled={loading || !prompt.trim()}
          style={{
            position: 'absolute', bottom: 12, right: 12,
            background: (loading || !prompt.trim()) ? 'rgba(0,245,255,0.05)' : 'rgba(0,245,255,0.15)',
            border: '1px solid rgba(0,245,255,0.35)',
            borderRadius: 3, color: '#00f5ff', fontSize: 11, fontWeight: 700,
            padding: '8px 20px', cursor: (loading || !prompt.trim()) ? 'not-allowed' : 'pointer',
            letterSpacing: 2, fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          {loading ? 'RUNNING…' : 'RUN →'}
        </button>
      </div>

      {/* Response */}
      {(response || loading) && (
        <div>
          {meta && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 9, padding: '2px 10px', borderRadius: 2, letterSpacing: 1,
                background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)',
                color: '#00f5ff',
              }}>MODULE: {meta.module}</span>
              {meta.intent && <span style={{
                fontSize: 9, padding: '2px 10px', borderRadius: 2, letterSpacing: 1,
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,245,255,0.1)',
                color: '#4a6080',
              }}>INTENT: {meta.intent}</span>}
            </div>
          )}
          <div style={{
            background: '#020810',
            border: '1px solid rgba(0,245,255,0.12)',
            borderRadius: 4, padding: '20px 22px',
            color: loading ? '#4a6080' : '#a0d0f0',
            fontSize: 12, lineHeight: 1.8,
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            whiteSpace: 'pre-wrap', maxHeight: 360, overflowY: 'auto',
            minHeight: 60,
          }}>
            {loading ? '◈ Processing…' : response}
          </div>
        </div>
      )}

      {/* Mini history */}
      {history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: '#2a4a60', letterSpacing: 2, marginBottom: 8 }}>RECENT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {history.map((h, i) => (
              <div key={i}
                onClick={() => { setPrompt(h.prompt); setAction(h.action) }}
                style={{
                  padding: '8px 14px', borderRadius: 3,
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,245,255,0.06)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                <span style={{ fontSize: 11, color: '#6a8aa0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.prompt}
                </span>
                <span style={{ fontSize: 9, color: '#2a4a60', flexShrink: 0 }}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

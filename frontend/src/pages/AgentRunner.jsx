// frontend/src/pages/AgentRunner.jsx — v3 NEW PAGE
// Autonomous agent UI with streaming step events
import { useState, useRef, useEffect } from 'react'
import '../styles/design-system.css'

const API = '/api/v1'

function StepEvent({ event }) {
  const colors = { plan: 'var(--info)', step: 'var(--success)', think: 'var(--brand)', error: 'var(--error)', done: 'var(--success)' }
  const icons  = { plan: '📋', step: '⚡', think: '💭', error: '✗', done: '✓' }

  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-1)', animation: 'fadeIn 0.2s ease' }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icons[event.type] || '•'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: colors[event.type], textTransform: 'uppercase', letterSpacing: '0.05em' }}>{event.type}</span>
          {event.tool && <span className="badge badge-neutral">{event.tool}</span>}
          {event.n && <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Step {event.n}</span>}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-1)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
          {event.type === 'plan' && <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{event.steps?.length} steps planned</span>}
          {event.type === 'think' && event.reasoning}
          {event.type === 'step' && event.output}
          {event.type === 'done' && <div style={{ fontWeight: 500 }}>{event.result}</div>}
          {event.type === 'error' && <span style={{ color: 'var(--error)' }}>{event.message}</span>}
        </div>
        {event.type === 'done' && event.elapsed && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Completed in {event.elapsed}s · {event.steps_taken} steps</div>
        )}
      </div>
    </div>
  )
}

export default function AgentRunner() {
  const [goal, setGoal] = useState('')
  const [context, setContext] = useState('')
  const [events, setEvents] = useState([])
  const [running, setRunning] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [events])

  const run = async () => {
    if (!goal.trim() || running) return
    setRunning(true); setEvents([])
    const token = localStorage.getItem('genesis_token')

    try {
      const res = await fetch(`${API}/agent/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), context: context.trim() || undefined, stream: true }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const event = JSON.parse(line.slice(6))
              setEvents(prev => [...prev, event])
            } catch {}
          }
        }
      }
    } catch (e) {
      setEvents(prev => [...prev, { type: 'error', message: e.message }])
    } finally {
      setRunning(false)
    }
  }

  const EXAMPLE_GOALS = [
    'Research the latest developments in multimodal AI models',
    'Write a Python script to analyze CSV data and produce statistics',
    'Summarize the key concepts of transformer architecture',
  ]

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', marginBottom: 4 }}>Agent Runner</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Autonomous multi-step AI agent with tool use and planning</p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Goal</label>
        <textarea
          className="input"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="What should the agent accomplish?"
          style={{ minHeight: 80, resize: 'vertical', marginBottom: 12 }}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && run()}
        />
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Context (optional)</label>
        <textarea
          className="input"
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="Additional context or constraints…"
          style={{ minHeight: 60, resize: 'vertical', marginBottom: 12 }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {EXAMPLE_GOALS.map((g, i) => (
            <button key={i} onClick={() => setGoal(g)} className="badge badge-neutral" style={{ cursor: 'pointer', padding: '5px 10px' }}>
              {g.slice(0, 50)}…
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={run} disabled={running || !goal.trim()} className="btn btn-primary" style={{ minWidth: 120, justifyContent: 'center' }}>
            {running ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', marginRight: 6 }} /> Running…</> : '▶ Run Agent'}
          </button>
          {events.length > 0 && <button onClick={() => setEvents([])} className="btn btn-ghost">Clear</button>}
        </div>
      </div>

      {events.length > 0 && (
        <div className="card" style={{ padding: '0 20px' }}>
          {events.map((event, i) => <StepEvent key={i} event={event} />)}
          <div ref={bottomRef} style={{ height: 16 }} />
        </div>
      )}
    </div>
  )
}

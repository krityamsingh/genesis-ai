import { useState } from 'react'
import useGenesisStore from '../store/genesisStore'
import { toast } from '../lib/toast'

const MODULE_DATA = [
  {
    id: 'M1', name: 'Self-Learner', icon: '🧠', color: '#22C55E', colorDim: 'rgba(34,197,94,.12)',
    desc: 'Ingest knowledge from any source. Learn from URLs, PDFs, audio, and text. Auto-structures into a searchable knowledge graph.',
    calls: 1240, latency: '4.2s', last: '2 min ago', on: true,
  },
  {
    id: 'M2', name: 'Research Accel', icon: '🔬', color: '#3B82F6', colorDim: 'rgba(59,130,246,.12)',
    desc: 'Deep research and synthesis mode. Traverses multiple knowledge sources to produce academic-grade summaries and citations.',
    calls: 823, latency: '6.8s', last: '15 min ago', on: true,
  },
  {
    id: 'M3', name: 'AI Builder', icon: '⚡', color: '#A78BFA', colorDim: 'rgba(167,139,250,.12)',
    desc: 'Generates executable Python/JavaScript code. Understands context, auto-debugs, and writes tests. Full-stack capable.',
    calls: 456, latency: '3.1s', last: '1 hr ago', on: true,
  },
  {
    id: 'M4', name: 'Time Reconstruct', icon: '⏳', color: '#F59E0B', colorDim: 'rgba(245,158,11,.12)',
    desc: 'Reconstructs timelines from fragmentary knowledge. Ideal for historical analysis and sequential event ordering.',
    calls: 189, latency: '5.4s', last: '3 hrs ago', on: false,
  },
  {
    id: 'M5', name: 'Intuition Engine', icon: '✦', color: '#EC4899', colorDim: 'rgba(236,72,153,.12)',
    desc: 'Draws non-obvious connections across the knowledge graph. Surfaces hidden patterns, analogies, and emergent insights.',
    calls: 312, latency: '7.2s', last: '45 min ago', on: true,
  },
  {
    id: 'M6', name: 'Reality Sim', icon: '◈', color: '#EF4444', colorDim: 'rgba(239,68,68,.12)',
    desc: 'Runs counterfactual and scenario simulations. "What if" analysis with probability distributions and confidence intervals.',
    calls: 98, latency: '12.1s', last: '6 hrs ago', on: false,
  },
]

function Toggle({ on, color, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width:        '36px',
        height:       '20px',
        borderRadius: '10px',
        background:   on ? color : 'var(--bg-overlay)',
        position:     'relative',
        cursor:       'pointer',
        flexShrink:   0,
        transition:   'background .2s',
      }}
    >
      <div style={{
        position:     'absolute',
        top:          '3px',
        left:         '3px',
        width:        '14px',
        height:       '14px',
        borderRadius: '50%',
        background:   '#fff',
        transform:    on ? 'translateX(16px)' : 'none',
        transition:   'transform .18s var(--ease-out)',
        boxShadow:    '0 1px 3px rgba(0,0,0,.4)',
      }} />
    </div>
  )
}

function ModuleCard({ module: m, onToggle, onTest }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        background:   'var(--bg-surface)',
        border:       `1px solid ${hovered ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
        borderLeft:   `3px solid ${m.on ? m.color : 'var(--border-default)'}`,
        borderRadius: '14px',
        padding:      '20px',
        transition:   'transform 150ms var(--ease-out), border-color 150ms',
        transform:    hovered ? 'translateY(-2px)' : 'none',
        cursor:       'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width:          '40px',
            height:         '40px',
            borderRadius:   '12px',
            background:     m.colorDim,
            color:          m.color,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '18px',
          }}>{m.icon}</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{m.name}</div>
            <div style={{ fontSize: '11px', color: m.on ? m.color : 'var(--text-muted)', marginTop: '1px' }}>
              {m.id} · {m.on ? 'Active' : 'Standby'}
            </div>
          </div>
        </div>
        <Toggle on={m.on} color={m.color} onChange={() => onToggle(m.id)} />
      </div>

      {/* Description */}
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
        {m.desc}
      </p>

      {/* Stats row */}
      <div style={{
        display:     'flex',
        gap:         '16px',
        paddingTop:  '14px',
        borderTop:   '1px solid var(--border-subtle)',
        marginBottom:'14px',
      }}>
        {[
          { label: 'Total calls',  value: m.calls.toLocaleString() },
          { label: 'Avg latency', value: m.latency },
          { label: 'Last used',   value: m.last },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-ghost" onClick={() => onTest(m)} style={{ fontSize: '11px', padding: '5px 10px' }}>
          ▶ Test Module
        </button>
        <button className="btn btn-ghost" onClick={() => toast(`Viewing ${m.id} logs`, 'info')} style={{ fontSize: '11px', padding: '5px 10px' }}>
          View Logs
        </button>
      </div>
    </div>
  )
}

// ── Test drawer ───────────────────────────────────────────────────────────────
function TestDrawer({ module: m, onClose }) {
  const [query,    setQuery]    = useState('')
  const [response, setResponse] = useState('')
  const [loading,  setLoading]  = useState(false)

  const run = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResponse('')
    await new Promise(r => setTimeout(r, 1000))
    setResponse(`[${m.id}] Processed query: "${query}"\n\nThis is a test response from ${m.name}. In production, this would stream from the GENESIS AI engine via WebSocket.`)
    setLoading(false)
  }

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      zIndex:        'var(--z-modal)',
      display:       'flex',
      alignItems:    'stretch',
      justifyContent:'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ flex: 1, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
      />
      {/* Drawer */}
      <div style={{
        width:        '420px',
        background:   'var(--bg-surface)',
        borderLeft:   '1px solid var(--border-default)',
        display:      'flex',
        flexDirection:'column',
        animation:    'slideInRight 250ms var(--ease-out)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '20px' }}>{m.icon}</div>
            <div>
              <div style={{ fontWeight: '600' }}>Test {m.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.id} · Direct query</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            className="input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), run())}
            placeholder={`Test a query against ${m.name}…`}
            rows={4}
            style={{ resize: 'none' }}
          />
          <button className="btn btn-primary" onClick={run} disabled={loading || !query.trim()}>
            {loading ? <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Running…</> : `▶ Run with ${m.id}`}
          </button>
          {response && (
            <div style={{
              background:   'var(--bg-elevated)',
              border:       '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding:      '14px',
              fontSize:     '12px',
              fontFamily:   "'JetBrains Mono', monospace",
              color:        'var(--text-secondary)',
              lineHeight:   '1.7',
              whiteSpace:   'pre-wrap',
              flex:         1,
              overflowY:    'auto',
            }}>
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Modules() {
  const { user } = useGenesisStore()
  const [modules, setModules] = useState(MODULE_DATA)
  const [testing, setTesting] = useState(null)

  const toggleModule = (id) => {
    if (!user?.is_admin) { toast('Admin access required to toggle modules', 'error'); return }
    setModules(prev => prev.map(m => {
      if (m.id !== id) return m
      const next = { ...m, on: !m.on }
      toast(`${m.name} ${next.on ? 'enabled' : 'disabled'}`, 'info')
      return next
    }))
  }

  const active  = modules.filter(m => m.on).length
  const standby = modules.filter(m => !m.on).length

  return (
    <div className="page-enter" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Module Management</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-green">{active} active</span>
          <span className="badge badge-amber">{standby} standby</span>
          {!user?.is_admin && (
            <span className="badge badge-red">View only</span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {modules.map(m => (
          <ModuleCard
            key={m.id}
            module={m}
            onToggle={toggleModule}
            onTest={setTesting}
          />
        ))}
      </div>

      {testing && (
        <TestDrawer module={testing} onClose={() => setTesting(null)} />
      )}
    </div>
  )
}

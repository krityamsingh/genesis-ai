import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import { toast } from '../lib/toast'

const STAT_CARDS = [
  { label: 'Docs Learned',    key: 'docs',    icon: '📚', color: '#3B82F6', trend: '+47 today'   },
  { label: 'Total Queries',   key: 'queries', icon: '💬', color: '#6366F1', trend: '+128 today'  },
  { label: 'Active Modules',  key: 'modules', icon: '⬡',  color: '#22C55E', trend: '2 on standby'},
  { label: 'KG Nodes',        key: 'nodes',   icon: '◈',  color: '#F59E0B', trend: '+1.2k today' },
]

const CHART_DATA = [42, 78, 55, 91, 67, 110, 128]
const DAYS       = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MODULE_STATUS = [
  { id: 'M1', name: 'Self-Learner',   icon: '🧠', color: '#22C55E', calls: 1240, on: true  },
  { id: 'M2', name: 'Research Accel', icon: '🔬', color: '#3B82F6', calls: 823,  on: true  },
  { id: 'M3', name: 'AI Builder',     icon: '⚡', color: '#A78BFA', calls: 456,  on: true  },
  { id: 'M4', name: 'Time Reconst.',  icon: '⏳', color: '#F59E0B', calls: 189,  on: false },
  { id: 'M5', name: 'Intuition Eng.', icon: '✦',  color: '#EC4899', calls: 312,  on: true  },
  { id: 'M6', name: 'Reality Sim',    icon: '◈',  color: '#EF4444', calls: 98,   on: false },
]

const ACTIVITY = [
  { url: 'arxiv.org/abs/2503.12345',            type: 'URL',  icon: '🌐', bg: 'var(--blue-dim)',  color: 'var(--blue)',  count: 142, time: '2m ago'  },
  { url: 'gdrive/project-brief.pdf',            type: 'PDF',  icon: '📄', bg: 'var(--amber-dim)', color: 'var(--amber)', count: 87,  time: '15m ago' },
  { url: 'wikipedia.org/Quantum_Computing',     type: 'URL',  icon: '🌐', bg: 'var(--blue-dim)',  color: 'var(--blue)',  count: 211, time: '1h ago'  },
  { url: 'github.com/openai/whisper',           type: 'URL',  icon: '🌐', bg: 'var(--blue-dim)',  color: 'var(--blue)',  count: 94,  time: '3h ago'  },
  { url: 'paste: Neural network architecture…', type: 'Text', icon: '📝', bg: 'var(--green-dim)', color: 'var(--green)', count: 36,  time: '5h ago'  },
]

// ── Live clock ────────────────────────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ card, stats }) {
  const values = {
    docs:    stats?.total_docs    ?? '3,847',
    queries: stats?.total_queries ?? '12,391',
    modules: `${stats?.active_modules ?? 4} / 6`,
    nodes:   stats?.kg_nodes      ?? '94,210',
  }
  return (
    <div className="stat-card" style={{
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding:      '18px 20px',
      position:     'relative',
      overflow:     'hidden',
      transition:   'border-color 200ms, transform 150ms',
      cursor:       'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)';  e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        width:          '36px',
        height:         '36px',
        borderRadius:   '10px',
        background:     `${card.color}1a`,
        color:          card.color,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '16px',
        marginBottom:   '12px',
      }}>{card.icon}</div>
      <div style={{ fontSize: '26px', fontWeight: '600', letterSpacing: '-.5px', lineHeight: 1 }}>
        {values[card.key]}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: '4px' }}>
        {card.label}
      </div>
      <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--green)', marginTop: '6px' }}>
        {card.trend}
      </div>
      {/* Glow */}
      <div style={{
        position:     'absolute',
        bottom:       '-20px',
        right:        '-10px',
        width:        '80px',
        height:       '80px',
        borderRadius: '50%',
        background:   card.color,
        opacity:      '0.06',
        filter:       'blur(20px)',
      }} />
    </div>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function ActivityChart() {
  const max = Math.max(...CHART_DATA)
  return (
    <div style={{ height: '130px', display: 'flex', alignItems: 'flex-end', gap: '6px', paddingTop: '8px' }}>
      {CHART_DATA.map((h, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width:        '100%',
            height:       `${(h / max) * 100}px`,
            background:   `linear-gradient(to top, var(--accent), var(--accent-bright))`,
            borderRadius: '4px 4px 0 0',
            opacity:      0.4 + (h / max) * 0.6,
            transition:   'opacity 200ms',
            cursor:       'default',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = String(0.4 + (h / max) * 0.6)}
          title={`${h} queries`}
          />
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            {DAYS[i]}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Quick learn ───────────────────────────────────────────────────────────────
function QuickLearn() {
  const [val,     setVal]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)

  const learn = async () => {
    if (!val.trim()) { toast('Enter a URL, file path, or text', 'error'); return }
    setLoading(true)
    setResult(null)
    try {
      await new Promise(r => setTimeout(r, 1500))   // TODO: real API call
      const count = Math.floor(Math.random() * 200) + 50
      setResult(`✓ Knowledge ingested — ${count} nodes added to graph`)
      toast(`Knowledge ingested — ${count} nodes added`, 'success')
    } catch {
      toast('Failed to ingest knowledge', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding:      '20px 24px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Feed knowledge to GENESIS</h3>
        <span className="badge badge-accent">M1 Self-Learner</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          className="input"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && learn()}
          placeholder="Paste a URL, file path, or text to learn from..."
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={learn} disabled={loading}>
          {loading ? <><div className="spinner" style={{ width: '14px', height: '14px', borderTopColor: '#fff' }} /> Learning…</> : 'Learn from URL'}
        </button>
        <button className="btn btn-ghost" onClick={() => toast('PDF upload dialog opened', 'info')}>Upload PDF</button>
      </div>
      {result && (
        <div style={{
          marginTop:    '10px',
          padding:      '8px 12px',
          background:   'var(--green-dim)',
          border:       '1px solid rgba(34,197,94,.25)',
          borderRadius: '8px',
          fontSize:     '12px',
          color:        'var(--green)',
        }}>
          {result}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, stats } = useGenesisStore()
  const navigate         = useNavigate()
  const clock            = useLiveClock()

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1>
            Welcome back,{' '}
            <span style={{ color: 'var(--accent)' }}>{user?.username || 'user'}</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{clock}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/chat')}>+ New Chat</button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {STAT_CARDS.map(c => <StatCard key={c.key} card={c} stats={stats} />)}
      </div>

      {/* Two-column: chart + module status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3>Query Activity</h3>
            <span className="badge badge-accent">Last 7 days</span>
          </div>
          <ActivityChart />
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3>Module Status</h3>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => navigate('/modules')}>View all</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {MODULE_STATUS.map(m => (
              <div key={m.id} style={{
                display:      'flex',
                alignItems:   'center',
                justifyContent:'space-between',
                padding:      '8px 10px',
                background:   'var(--bg-elevated)',
                borderRadius: '8px',
                border:       '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '12px' }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '500' }}>{m.id}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.calls.toLocaleString()} calls</div>
                  </div>
                </div>
                <div style={{
                  width:      '7px',
                  height:     '7px',
                  borderRadius:'50%',
                  background: m.on ? 'var(--green)' : 'var(--text-muted)',
                  animation:  m.on ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick learn */}
      <QuickLearn />

      {/* Activity feed */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3>Recent Learning Sessions</h3>
          <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }}>View all</button>
        </div>
        {ACTIVITY.map((s, i) => (
          <div key={i} style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '12px',
            padding:     '10px 0',
            borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{
              width:          '32px',
              height:         '32px',
              borderRadius:   '8px',
              background:     s.bg,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '14px',
              flexShrink:     0,
            }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
                {s.url}
              </div>
            </div>
            <span className="badge" style={{ background: s.bg, color: s.color }}>{s.type}</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.count} nodes</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: '50px', textAlign: 'right' }}>{s.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

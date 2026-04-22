// frontend/src/pages/Dashboard.jsx — v3 UPGRADE
// Stats overview, recent conversations, module health cards
import { useEffect, useState } from 'react'
import '../styles/design-system.css'

const API = '/api/v1'

function StatCard({ value, label, icon, trend }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-full)',
            background: trend >= 0 ? 'var(--success-bg)' : 'var(--error-bg)',
            color: trend >= 0 ? 'var(--success)' : 'var(--error)',
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function ModuleCard({ name, icon, status, description }) {
  const colors = { active: 'var(--success)', idle: 'var(--warning)', error: 'var(--error)' }
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 24, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: colors[status] || 'var(--text-4)', flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{status}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
  )
}

const MODULES = [
  { name: 'M1 Self-Learner',      icon: '📚', description: 'Ingests URLs, PDFs, audio, and video to build knowledge.' },
  { name: 'M2 Research Accel',    icon: '🔬', description: 'Parses papers, finds connections, generates hypotheses.' },
  { name: 'M3 AI Builder',        icon: '🏗️', description: 'Generates full AI system architectures and deployments.' },
  { name: 'M4 Time Reconstruct',  icon: '⏪', description: 'Reconstructs and projects historical + future timelines.' },
  { name: 'M5 Intuition Engine',  icon: '💡', description: 'Bayesian reasoning, gap-filling, cross-module synthesis.' },
  { name: 'M6 Reality Sim',       icon: '🌐', description: 'Runs world-model simulations and code synthesis.' },
  { name: 'M7 Multimodal',        icon: '🖼️', description: 'Image, audio, and document understanding via vision APIs.' },
  { name: 'M8 Agent Runner',      icon: '🤖', description: 'Autonomous multi-step agent with tool use and planning.' },
  { name: 'M9 Code Interpreter',  icon: '⚡', description: 'Safe Python, Bash, SQL execution with output capture.' },
]

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('genesis_token')
    fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStats).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, fontWeight: 'normal', marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>System overview and module status</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton card" style={{ height: 100 }} />)
        ) : (
          <>
            <StatCard icon="💬" label="Total Conversations" value={stats?.total_conversations ?? 0} />
            <StatCard icon="📨" label="Messages Sent" value={stats?.total_messages ?? 0} />
            <StatCard icon="📚" label="Knowledge Chunks" value={stats?.knowledge_chunks ?? 0} />
            <StatCard icon="🧩" label="Active Modules" value={stats?.active_modules ?? MODULES.length} />
          </>
        )}
      </div>

      {/* Module grid */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Module Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {MODULES.map((m, i) => (
            <ModuleCard key={i} {...m} status="active" />
          ))}
        </div>
      </div>
    </div>
  )
}

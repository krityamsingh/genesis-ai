import { useState, useEffect } from 'react'
import { toast } from '../lib/toast'

const USERS = [
  { username: 'krityam',      email: 'krityam@genesis.ai',      role: 'Admin', lastLogin: 'Now',    active: true  },
  { username: 'alice_dev',    email: 'alice@genesis.ai',        role: 'User',  lastLogin: '2h ago', active: true  },
  { username: 'bob_research', email: 'bob@genesis.ai',          role: 'User',  lastLogin: '1d ago', active: true  },
  { username: 'carol_ml',     email: 'carol@genesis.ai',        role: 'User',  lastLogin: '3d ago', active: false },
]
const HEALTH = [
  { name: 'API Server',      value: '42ms',       status: 'healthy' },
  { name: 'Database',        value: 'Connected',  status: 'healthy' },
  { name: 'ChromaDB',        value: '94k nodes',  status: 'healthy' },
  { name: 'Celery Worker',   value: '3 active',   status: 'healthy' },
  { name: 'Redis',           value: 'Connected',  status: 'healthy' },
  { name: 'HuggingFace API', value: 'Degraded',   status: 'warn'    },
]
const LOGS = [
  '[INFO]  API server started on :8000',
  '[INFO]  ChromaDB connection established — 94,210 nodes',
  '[INFO]  Gemma-3-27b model loaded successfully',
  '[WARN]  HuggingFace API rate limit approaching (80%)',
  '[INFO]  User krityam authenticated via JWT',
  '[INFO]  M1 ingestion: arxiv.org → 142 nodes extracted',
  '[INFO]  Chat session started: session_8f3a2c',
  '[DEBUG] WebSocket token stream: 128 tok/s',
  '[INFO]  Knowledge graph updated: 94,210 nodes total',
  '[INFO]  Celery task completed: pdf_ingest_task',
]
const BACKUPS = [
  { name: 'genesis-backup-2025-04-18.tar.gz', size: '847 MB', date: 'Today 14:00'    },
  { name: 'genesis-backup-2025-04-17.tar.gz', size: '841 MB', date: 'Yesterday 14:00'},
  { name: 'genesis-backup-2025-04-16.tar.gz', size: '835 MB', date: '2d ago 14:00'   },
]

const TABS = ['Users', 'Modules', 'Health', 'Training', 'Logs', 'Backup']

function UsersTab() {
  const [search, setSearch] = useState('')
  const filtered = USERS.filter(u => !search || u.username.includes(search) || u.email.includes(search))
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input className="input" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '240px' }} />
        <button className="btn btn-primary" style={{ fontSize: '12px' }} onClick={() => toast('Create user form', 'info')}>+ Create User</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Username', 'Email', 'Role', 'Last Login', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.username} style={{ transition: 'background 120ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>{u.username}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className={`badge ${u.role === 'Admin' ? 'badge-accent' : 'badge-blue'}`}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>{u.lastLogin}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className={`badge ${u.active ? 'badge-green' : 'badge-amber'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => toast(`Edit ${u.username}`, 'info')}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HealthTab() {
  const [lastRefresh, setLastRefresh] = useState('just now')
  useEffect(() => {
    const t = setInterval(() => setLastRefresh('just now'), 10_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last refreshed: {lastRefresh}</div>
        <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => toast('Health data refreshed', 'success')}>
          ⟳ Refresh
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {HEALTH.map(h => (
          <div key={h.name} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{h.name}</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: h.status === 'healthy' ? 'var(--green)' : h.status === 'warn' ? 'var(--amber)' : 'var(--red)', marginTop: '2px' }}>
                {h.value}
              </div>
            </div>
            <div style={{
              width:     '8px',
              height:    '8px',
              borderRadius:'50%',
              background: h.status === 'healthy' ? 'var(--green)' : h.status === 'warn' ? 'var(--amber)' : 'var(--red)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function LogsTab() {
  const [level, setLevel] = useState('All')
  const filtered = LOGS.filter(l => level === 'All' || l.includes(`[${level}]`))
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {['All', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map(f => (
          <button key={f} className={`btn ${level === f ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setLevel(f)}>{f}</button>
        ))}
        <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px', marginLeft: 'auto' }} onClick={() => toast('Logs exported', 'success')}>↓ Export</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', lineHeight: '1.8' }}>
          {filtered.map((l, i) => (
            <div key={i} style={{
              color: l.includes('[WARN]') ? 'var(--amber)' : l.includes('[ERROR]') ? 'var(--red)' : l.includes('[DEBUG]') ? 'var(--text-muted)' : 'var(--text-secondary)',
              padding: '1px 0',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.012)',
            }}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TrainingTab() {
  const [running, setRunning] = useState(false)
  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '14px' }}>Training Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[['Epochs', '10'], ['Batch Size', '32'], ['Learning Rate', '1e-4']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{l}</div>
              <input className="input" defaultValue={v} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => { setRunning(true); toast('Training started', 'success') }} disabled={running}>
            {running ? <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Training…</> : '▶ Start Training'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setRunning(false); toast('Training stopped', 'info') }} disabled={!running}>⏹ Stop</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '10px' }}>Training Log</h3>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: running ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: '1.8', minHeight: '80px' }}>
          {running ? (
            <>
              <div style={{ color: 'var(--green)' }}>[INFO] Training job initialised</div>
              <div>[INFO] Loading dataset: 3,847 documents</div>
              <div>[INFO] Epoch 1/10 — loss: 2.41</div>
            </>
          ) : 'Waiting for training to start…'}
        </div>
      </div>
    </div>
  )
}

function BackupTab() {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => toast('Backup created successfully', 'success')}>+ Create Backup</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {BACKUPS.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: i < BACKUPS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <span style={{ fontSize: '18px' }}>📦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '500', fontFamily: "'JetBrains Mono', monospace" }}>{b.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.size} · {b.date}</div>
            </div>
            <span className="badge badge-green">complete</span>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => toast('Downloading backup…', 'info')}>↓</button>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => toast('Backup restored', 'success')}>⟳</button>
            <button className="btn btn-danger" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => toast('Backup deleted', 'info')}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModulesAdminTab() {
  return (
    <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
      Module admin controls — see the Modules page for full management
    </div>
  )
}

const TAB_COMPONENTS = {
  users:    UsersTab,
  modules:  ModulesAdminTab,
  health:   HealthTab,
  training: TrainingTab,
  logs:     LogsTab,
  backup:   BackupTab,
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users')
  const TabComponent = TAB_COMPONENTS[activeTab] || (() => null)

  return (
    <div className="page-enter" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <h1>Admin Panel</h1>
        <span className="badge badge-red">Admin Only</span>
      </div>

      {/* Tab bar */}
      <div style={{
        display:      'flex',
        gap:          '2px',
        marginBottom: '20px',
        background:   'var(--bg-surface)',
        borderRadius: '12px',
        padding:      '4px',
        width:        'fit-content',
        border:       '1px solid var(--border-subtle)',
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t.toLowerCase())}
            style={{
              padding:      '7px 16px',
              borderRadius: '9px',
              fontSize:     '13px',
              color:        activeTab === t.toLowerCase() ? 'var(--text-primary)' : 'var(--text-muted)',
              background:   activeTab === t.toLowerCase() ? 'var(--bg-elevated)' : 'transparent',
              border:       'none',
              cursor:       'pointer',
              transition:   'all 150ms',
              fontFamily:   "'DM Sans', sans-serif",
              fontWeight:   activeTab === t.toLowerCase() ? '500' : '400',
              boxShadow:    activeTab === t.toLowerCase() ? 'var(--shadow-sm)' : 'none',
              whiteSpace:   'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <TabComponent />
    </div>
  )
}

// admin/frontend/src/AdminApp.jsx
// GENESIS Admin — Shell / Layout
//
// FIXES APPLIED:
//   • Token stored in sessionStorage (matching AdminLogin.jsx which also uses
//     sessionStorage). Previously AdminApp read/wrote localStorage while
//     AdminLogin wrote to sessionStorage — the token was never found on
//     page load so every refresh forced a re-login even with a valid token.
//   • Corrected import: LogsViewer → logsviewer (file is logsviewer.jsx,
//     not LogsViewer.jsx — case-sensitive on Linux).
// =============================================================================

import React, { useState } from 'react'
import AdminLogin      from './AdminLogin'
import SystemHealth    from './SystemHealth'
import ModelMonitor    from './ModelMonitor'
import ModuleManager   from './ModuleManager'
import UserManager     from './UserManager'
import LogsViewer      from './logsviewer'
import BackupManager   from './BackupManager'
import DatasetUploader from './DatasetUploader'
import PromptEditor    from './PromptEditor'
import TrainingPanel   from './TrainingPanel'

const TOKEN_KEY = 'genesis_admin_token'   // must match AdminLogin.jsx

const NAV = [
  { key: 'Health',    icon: '◈', label: 'System Health' },
  { key: 'Model',     icon: '◆', label: 'Model Monitor' },
  { key: 'Modules',   icon: '⬡', label: 'Modules' },
  { key: 'Users',     icon: '◉', label: 'Users' },
  { key: 'Logs',      icon: '≡', label: 'Live Logs' },
  { key: 'Backup',    icon: '⊞', label: 'Backup' },
  { key: 'Datasets',  icon: '⊟', label: 'Datasets' },
  { key: 'Prompts',   icon: '⌥', label: 'Prompt Logs' },
  { key: 'Training',  icon: '⚙', label: 'Training' },
]

const PANELS = {
  Health: SystemHealth, Model: ModelMonitor, Modules: ModuleManager,
  Users: UserManager, Logs: LogsViewer, Backup: BackupManager,
  Datasets: DatasetUploader, Prompts: PromptEditor, Training: TrainingPanel,
}

const S = {
  sidebar: {
    width: 200, minWidth: 200,
    background: '#030c1a',
    borderRight: '1px solid rgba(0,245,255,0.1)',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'JetBrains Mono','Fira Code',monospace",
  },
  logo: {
    padding: '24px 20px 18px',
    borderBottom: '1px solid rgba(0,245,255,0.08)',
  },
  logoText: { fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: -0.5 },
  logoDot:  { color: '#00f5ff' },
  logoSub:  { fontSize: 9, color: '#2a4a60', letterSpacing: 2, marginTop: 3 },
  nav: { flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 3, border: 'none',
    background: active ? 'rgba(0,245,255,0.1)' : 'transparent',
    borderLeft: active ? '2px solid #00f5ff' : '2px solid transparent',
    color: active ? '#00f5ff' : '#3d5a72',
    fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: 0.5, cursor: 'pointer',
    transition: 'all 0.15s', textAlign: 'left', width: '100%',
    fontFamily: 'inherit',
  }),
  navIcon: { fontSize: 13, width: 16, textAlign: 'center' },
  footer: {
    padding: '16px 12px',
    borderTop: '1px solid rgba(0,245,255,0.08)',
  },
  logoutBtn: {
    background: 'none', border: '1px solid rgba(255,60,60,0.2)',
    borderRadius: 3, color: '#ff6060', fontSize: 10,
    padding: '6px 12px', cursor: 'pointer', width: '100%',
    fontFamily: 'inherit', letterSpacing: 1,
    transition: 'all 0.15s',
  },
  main: {
    flex: 1, overflow: 'auto',
    background: '#040913',
    fontFamily: "'JetBrains Mono','Fira Code',monospace",
  },
  mainHeader: {
    padding: '20px 32px 0',
    borderBottom: '1px solid rgba(0,245,255,0.06)',
    marginBottom: 0,
  },
  breadcrumb: { fontSize: 10, color: '#2a4a60', letterSpacing: 2, marginBottom: 4 },
  mainTitle:  { fontSize: 20, fontWeight: 700, color: '#fff', paddingBottom: 16 },
  content:    { padding: '28px 32px' },
}

export default function AdminApp() {
  // FIX: read from sessionStorage (AdminLogin writes there)
  const [token, setToken] = useState(sessionStorage.getItem(TOKEN_KEY) || '')
  const [tab,   setTab]   = useState('Health')

  if (!token) return <AdminLogin onLogin={setToken} />

  const Panel   = PANELS[tab]
  const navItem = NAV.find(n => n.key === tab)

  const logout = () => {
    // FIX: clear sessionStorage (not localStorage)
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoText}>GENESIS<span style={S.logoDot}>_</span></div>
          <div style={S.logoSub}>ADMIN PANEL</div>
        </div>
        <nav style={S.nav}>
          {NAV.map(({ key, icon, label }) => (
            <button key={key} style={S.navBtn(tab === key)} onClick={() => setTab(key)}>
              <span style={S.navIcon}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div style={S.footer}>
          <button style={S.logoutBtn} onClick={logout}>⏻ LOGOUT</button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <div style={S.mainHeader}>
          <div style={S.breadcrumb}>GENESIS / ADMIN / {tab.toUpperCase()}</div>
          <div style={S.mainTitle}>{navItem?.icon} {navItem?.label}</div>
        </div>
        <div style={S.content}>
          <Panel token={token} />
        </div>
      </main>
    </div>
  )
}

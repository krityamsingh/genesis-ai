// admin/frontend/src/AdminApp.jsx — RESTYLED (Claude.ai white design)
// Replaces dark #030c1a theme with clean white sidebar + main panel.
// Added LoginHistory tab.
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
import LoginHistory    from './LoginHistory'

const TOKEN_KEY = 'genesis_admin_token'

const NAV = [
  { key: 'Health',       icon: '◈', label: 'System Health' },
  { key: 'Model',        icon: '◆', label: 'Model Monitor' },
  { key: 'Modules',      icon: '⬡', label: 'Modules' },
  { key: 'Users',        icon: '◉', label: 'Users' },
  { key: 'LoginHistory', icon: '🕒', label: 'Login History' },
  { key: 'Logs',         icon: '≡',  label: 'Logs' },
  { key: 'Prompts',      icon: '✎',  label: 'Prompt Editor' },
  { key: 'Training',     icon: '⚙',  label: 'Training' },
  { key: 'Dataset',      icon: '⊞',  label: 'Datasets' },
  { key: 'Backup',       icon: '⊙',  label: 'Backup' },
]

export default function AdminApp() {
  const stored = sessionStorage.getItem(TOKEN_KEY) || ''
  const [token,       setToken]       = useState(stored)
  const [activeTab,   setActiveTab]   = useState('Health')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogin = (tok) => { setToken(tok); sessionStorage.setItem(TOKEN_KEY, tok) }
  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
  }

  if (!token) return <AdminLogin onLogin={handleLogin} />

  const renderTab = () => {
    const props = { token }
    switch (activeTab) {
      case 'Health':       return <SystemHealth    {...props} />
      case 'Model':        return <ModelMonitor    {...props} />
      case 'Modules':      return <ModuleManager   {...props} />
      case 'Users':        return <UserManager     {...props} />
      case 'LoginHistory': return <LoginHistory    {...props} />
      case 'Logs':         return <LogsViewer      {...props} />
      case 'Prompts':      return <PromptEditor    {...props} />
      case 'Training':     return <TrainingPanel   {...props} />
      case 'Dataset':      return <DatasetUploader {...props} />
      case 'Backup':       return <BackupManager   {...props} />
      default:             return <SystemHealth    {...props} />
    }
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      background: '#fff',
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 56, flexShrink: 0,
        background: '#F9F9F9',
        borderRight: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column',
        transition: 'width 200ms ease', overflow: 'hidden',
      }}>
        {/* Logo row */}
        <div style={{
          padding: '16px 14px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #E5E7EB',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: '#1A1A1A', color: '#fff', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>G</div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>Genesis Admin</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Control Panel</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: '#9CA3AF', fontSize: 16, flexShrink: 0,
            }}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >☰</button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {NAV.map(({ key, icon, label }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                title={!sidebarOpen ? label : ''}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: '8px 10px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', marginBottom: 2,
                  background: active ? '#EAEAEA' : 'transparent',
                  color: active ? '#1A1A1A' : '#6B7280',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13, textAlign: 'left',
                  borderLeft: active ? '2px solid #2563EB' : '2px solid transparent',
                  transition: 'all 120ms',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F0F0F0' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #E5E7EB' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: '8px 10px', borderRadius: 8,
              border: 'none', cursor: 'pointer', background: 'transparent',
              color: '#EF4444', fontSize: 13, fontWeight: 500,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span>⏻</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
        {/* Topbar */}
        <div style={{
          padding: '14px 24px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center',
          background: '#fff', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1A1A1A' }}>
            {NAV.find(n => n.key === activeTab)?.label || activeTab}
          </h1>
        </div>

        {/* Tab content */}
        <div style={{ minHeight: 'calc(100vh - 57px)' }}>
          {renderTab()}
        </div>
      </div>
    </div>
  )
}

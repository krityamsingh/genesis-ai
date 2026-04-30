// AdminApp.jsx — Genesis Admin Shell
// Slate sidebar + white main panel. Full nav, keyboard shortcuts, toast system.
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
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
import { C, F } from './design'

const TOKEN_KEY = 'genesis_admin_token'

// ── Toast context ──────────────────────────────────────────────────────────────
export const ToastContext = createContext(null)
export function useToast() { return useContext(ToastContext) }

const NAV = [
  { key: 'Health',       icon: '⬡', label: 'System Health',   badge: null },
  { key: 'Model',        icon: '◈', label: 'Model Monitor',   badge: null },
  { key: 'Modules',      icon: '◉', label: 'Modules & Layers',badge: null },
  { key: 'Users',        icon: '⊕', label: 'Users',           badge: null },
  { key: 'LoginHistory', icon: '◇', label: 'Login History',   badge: null },
  { key: 'Logs',         icon: '≡', label: 'System Logs',     badge: null },
  { key: 'Prompts',      icon: '✎', label: 'Prompt Editor',   badge: null },
  { key: 'Training',     icon: '⚙', label: 'Training Jobs',   badge: null },
  { key: 'Dataset',      icon: '⊞', label: 'Datasets',        badge: null },
  { key: 'Backup',       icon: '◎', label: 'Backup Manager',  badge: null },
]

const SECTIONS = [
  { label: 'Monitoring', keys: ['Health', 'Model'] },
  { label: 'Intelligence', keys: ['Modules'] },
  { label: 'Users & Auth', keys: ['Users', 'LoginHistory'] },
  { label: 'Operations', keys: ['Logs', 'Prompts', 'Training', 'Dataset', 'Backup'] },
]

export default function AdminApp() {
  const stored = sessionStorage.getItem(TOKEN_KEY) || ''
  const [token,       setToken]       = useState(stored)
  const [activeTab,   setActiveTab]   = useState('Health')
  const [collapsed,   setCollapsed]   = useState(false)
  const [toasts,      setToasts]      = useState([])
  const [badgeCounts, setBadgeCounts] = useState({})

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const handleLogin  = (tok) => { setToken(tok); sessionStorage.setItem(TOKEN_KEY, tok) }
  const handleLogout = () => { sessionStorage.removeItem(TOKEN_KEY); setToken('') }

  // Keyboard: [ and ] to navigate tabs
  useEffect(() => {
    const keys = NAV.map(n => n.key)
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '[') {
        const i = keys.indexOf(activeTab)
        if (i > 0) setActiveTab(keys[i - 1])
      } else if (e.key === ']') {
        const i = keys.indexOf(activeTab)
        if (i < keys.length - 1) setActiveTab(keys[i + 1])
      } else if (e.key === '\\') {
        setCollapsed(c => !c)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab])

  if (!token) return <AdminLogin onLogin={handleLogin} />

  const renderTab = () => {
    const props = { token, toast: addToast }
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

  const currentNav = NAV.find(n => n.key === activeTab) || NAV[0]

  return (
    <ToastContext.Provider value={addToast}>
      <div style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        fontFamily: F.sans,
        background: C.bgPage,
        '--font-sans': F.sans,
        '--font-mono': F.mono,
      }}>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside style={{
          width: collapsed ? 56 : 240, flexShrink: 0,
          background: C.bgSidebar,
          display: 'flex', flexDirection: 'column',
          transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          position: 'relative', zIndex: 20,
        }}>
          {/* Header */}
          <div style={{
            height: 56,
            padding: '0 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
              letterSpacing: -0.5,
            }}>G</div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', letterSpacing: -0.3 }}>
                  Genesis Admin
                </div>
                <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', marginTop: 1 }}>
                  v3 Control Panel
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand (\\)' : 'Collapse (\\)'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#475569', fontSize: 14, padding: 4, borderRadius: 4,
                display: 'flex', alignItems: 'center',
                transition: 'color 120ms',
                marginLeft: collapsed ? 'auto' : 0,
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
              onMouseLeave={e => e.currentTarget.style.color = '#475569'}
            >
              {collapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Nav sections */}
          <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 6px' }}>
            {SECTIONS.map(section => {
              const sectionNavs = NAV.filter(n => section.keys.includes(n.key))
              return (
                <div key={section.label} style={{ marginBottom: 6 }}>
                  {!collapsed && (
                    <div style={{
                      padding: '8px 10px 4px',
                      fontSize: 10, fontWeight: 700,
                      color: '#334155',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}>
                      {section.label}
                    </div>
                  )}
                  {sectionNavs.map(({ key, icon, label, badge }) => {
                    const active = activeTab === key
                    const count  = badgeCounts[key]
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        title={collapsed ? label : ''}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center',
                          gap: 9, padding: collapsed ? '9px 0' : '8px 10px',
                          borderRadius: 7, border: 'none', cursor: 'pointer',
                          marginBottom: 1,
                          background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                          color: active ? '#93C5FD' : '#64748B',
                          fontWeight: active ? 600 : 400,
                          fontSize: 13, textAlign: 'left',
                          transition: 'all 100ms',
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          borderLeft: active ? '2px solid #3B82F6' : '2px solid transparent',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' }}}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                        {!collapsed && (
                          <>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {label}
                            </span>
                            {count > 0 && (
                              <span style={{
                                background: '#EF4444', color: '#fff',
                                borderRadius: 99, padding: '1px 6px',
                                fontSize: 10, fontWeight: 700, flexShrink: 0,
                              }}>{count}</span>
                            )}
                          </>
                        )}
                        {active && !collapsed && (
                          <div style={{
                            position: 'absolute', right: 8,
                            width: 4, height: 4, borderRadius: '50%',
                            background: '#3B82F6',
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div style={{
            padding: '8px 6px 10px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            {!collapsed && (
              <div style={{
                padding: '6px 10px 8px',
                fontSize: 10, color: '#334155',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                [ ] navigate · \\ collapse
              </div>
            )}
            <button
              onClick={handleLogout}
              title={collapsed ? 'Logout' : ''}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 9, padding: collapsed ? '9px 0' : '8px 10px',
                borderRadius: 7, border: 'none', cursor: 'pointer',
                background: 'transparent', color: '#475569',
                fontSize: 13, fontWeight: 500,
                transition: 'all 100ms',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569' }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>⏻</span>
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* ── Main area ──────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topbar */}
          <header style={{
            height: 56, flexShrink: 0,
            padding: '0 24px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 12,
            background: C.bgCard,
            position: 'relative', zIndex: 10,
          }}>
            <span style={{ fontSize: 16, color: C.textMuted }}>{currentNav.icon}</span>
            <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.textPrimary, letterSpacing: -0.2 }}>
              {currentNav.label}
            </h1>
            <div style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {/* Status pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 99,
                background: C.bgMuted,
                fontSize: 11, color: C.textSecondary,
                border: `1px solid ${C.border}`,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: C.green,
                  boxShadow: `0 0 0 2px ${C.greenLight}`,
                }} />
                Online
              </div>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflow: 'auto', background: C.bgPage }}>
            <div style={{ minHeight: '100%' }}>
              {renderTab()}
            </div>
          </main>
        </div>

        {/* ── Toast stack ────────────────────────────────── */}
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          display: 'flex', flexDirection: 'column', gap: 8,
          zIndex: 9999, pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: t.type === 'error' ? '#1A0A0A' : t.type === 'success' ? '#0A1A12' : '#0F172A',
              border: `1px solid ${t.type === 'error' ? '#EF4444' : t.type === 'success' ? '#10B981' : '#334155'}`,
              color: t.type === 'error' ? '#FCA5A5' : t.type === 'success' ? '#6EE7B7' : '#94A3B8',
              borderRadius: 10, padding: '10px 16px',
              fontSize: 13, fontWeight: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              maxWidth: 360,
              animation: 'slideIn 200ms ease',
              pointerEvents: 'all',
            }}>
              {t.type === 'error' ? '⚠ ' : t.type === 'success' ? '✓ ' : '◈ '}{t.msg}
            </div>
          ))}
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box }
          ::-webkit-scrollbar { width: 4px; height: 4px }
          ::-webkit-scrollbar-track { background: transparent }
          ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px }
          ::-webkit-scrollbar-thumb:hover { background: #94A3B8 }
          @keyframes slideIn { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: translateX(0) } }
          @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
          @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
      </div>
    </ToastContext.Provider>
  )
}

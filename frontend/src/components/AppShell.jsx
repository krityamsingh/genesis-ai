import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import CommandPalette from './CommandPalette'
import Toast from './Toast'

// ── Sidebar nav items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { path: '/chat',      label: 'Chat',       icon: '◻' },
  { path: '/knowledge', label: 'Knowledge',  icon: '◈' },
  { path: '/modules',   label: 'Modules',    icon: '⬡' },
  { path: '/timeline',  label: 'Timeline',   icon: '◷' },
  { path: '/voice',     label: 'Voice',      icon: '⌾' },
]
const BOTTOM_ITEMS = [
  { path: '/admin',    label: 'Admin',    icon: '◫', adminOnly: true },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ expanded }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useGenesisStore()

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'GE'

  const NavItem = ({ item }) => {
    const active = location.pathname === item.path
    return (
      <div
        onClick={() => navigate(item.path)}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '10px',
          padding:        '10px 14px',
          margin:         '1px 4px',
          borderRadius:   '8px',
          cursor:         'pointer',
          color:          active ? 'var(--text-accent)' : 'var(--text-secondary)',
          background:     active ? 'var(--accent-dim)' : 'transparent',
          borderLeft:     active ? '2px solid var(--accent)' : '2px solid transparent',
          paddingLeft:    active ? '12px' : '12px',
          transition:     'all 120ms var(--ease-out)',
          whiteSpace:     'nowrap',
          overflow:       'hidden',
          position:       'relative',
        }}
        onMouseEnter={e => {
          if (!active) e.currentTarget.style.background = 'var(--bg-overlay)'
        }}
        onMouseLeave={e => {
          if (!active) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ fontSize: '16px', minWidth: '18px', textAlign: 'center' }}>{item.icon}</span>
        <span style={{
          fontSize:   '13px',
          fontWeight: '400',
          opacity:    expanded ? 1 : 0,
          transition: 'opacity 200ms',
        }}>{item.label}</span>
      </div>
    )
  }

  return (
    <nav style={{
      width:          expanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
      minWidth:       expanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
      background:     'var(--bg-subtle)',
      borderRight:    '1px solid var(--border-subtle)',
      display:        'flex',
      flexDirection:  'column',
      transition:     'width 300ms var(--ease-out), min-width 300ms var(--ease-out)',
      overflow:       'hidden',
      position:       'relative',
      zIndex:         'var(--z-sidebar)',
      flexShrink:     0,
    }}>
      {/* Logo */}
      <div style={{
        padding:        '16px 14px',
        display:        'flex',
        alignItems:     'center',
        gap:            '10px',
        height:         '56px',
        overflow:       'hidden',
        whiteSpace:     'nowrap',
        borderBottom:   '1px solid var(--border-subtle)',
        flexShrink:     0,
      }}>
        <div style={{
          width:          '28px',
          height:         '28px',
          minWidth:       '28px',
          background:     'linear-gradient(135deg, var(--accent), var(--accent-bright))',
          borderRadius:   '8px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       '14px',
          boxShadow:      '0 0 12px var(--accent-glow)',
        }}>🔥</div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-.2px' }}>GENESIS</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '.05em' }}>INTELLIGENCE ENGINE</div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(item => <NavItem key={item.path} item={item} />)}
        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 12px' }} />
        {BOTTOM_ITEMS.filter(item => !item.adminOnly || user?.is_admin).map(item => (
          <NavItem key={item.path} item={item} />
        ))}
      </div>

      {/* User row */}
      <div style={{
        padding:      '8px 8px 12px',
        borderTop:    '1px solid var(--border-subtle)',
        overflow:     'hidden',
        whiteSpace:   'nowrap',
        flexShrink:   0,
      }}>
        <div
          onClick={logout}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '10px',
            padding:      '8px 6px',
            borderRadius: '8px',
            cursor:       'pointer',
            transition:   'background 120ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width:          '28px',
            height:         '28px',
            minWidth:       '28px',
            borderRadius:   '50%',
            background:     user?.avatar_url
              ? `url(${user.avatar_url}) center/cover`
              : 'linear-gradient(135deg, var(--accent), var(--pink))',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '11px',
            fontWeight:     '600',
            color:          '#fff',
          }}>
            {!user?.avatar_url && initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username || 'User'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {user?.is_admin ? 'Admin' : 'Member'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────
function TopBar({ pageName, onOpenCmd }) {
  const navigate = useNavigate()
  return (
    <div style={{
      height:          '56px',
      padding:         '0 20px',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-between',
      borderBottom:    '1px solid var(--border-subtle)',
      background:      'var(--bg-subtle)',
      flexShrink:      0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>GENESIS</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>›</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{pageName}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="badge badge-green">
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          Online
        </div>
        <button
          className="btn btn-ghost"
          onClick={onOpenCmd}
          style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Search
          <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '5px', padding: '1px 6px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>⌘K</span>
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/chat')} style={{ fontSize: '12px', padding: '7px 14px' }}>
          + New Chat
        </button>
      </div>
    </div>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
const PAGE_NAMES = {
  '/dashboard': 'Dashboard',
  '/chat':      'Chat',
  '/knowledge': 'Knowledge',
  '/modules':   'Modules',
  '/timeline':  'Timeline',
  '/voice':     'Voice',
  '/admin':     'Admin',
  '/settings':  'Settings',
}

export default function AppShell({ children }) {
  const [cmdOpen, setCmdOpen]     = useState(false)
  const [sidebarPinned]           = useState(false)
  const [sidebarHovered, setHovered] = useState(false)
  const location = useLocation()
  const pageName = PAGE_NAMES[location.pathname] || 'GENESIS'

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const expanded = sidebarPinned || sidebarHovered

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Sidebar expanded={expanded} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar pageName={pageName} onOpenCmd={() => setCmdOpen(true)} />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      <Toast />
    </div>
  )
}

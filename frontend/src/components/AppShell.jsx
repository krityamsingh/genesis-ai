// frontend/src/components/AppShell.jsx — v3 UPGRADE
// Wraps protected pages (non-chat) with top nav and layout
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/design-system.css'

const NAV = [
  { path: '/chat',       icon: '💬', label: 'Chat' },
  { path: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { path: '/knowledge',  icon: '📚', label: 'Knowledge' },
  { path: '/modules',    icon: '🧩', label: 'Modules' },
  { path: '/training',   icon: '⚡', label: 'Training' },
  { path: '/timeline',   icon: '⏱️', label: 'Timeline' },
  { path: '/voice',      icon: '🎙️', label: 'Voice' },
]

export default function AppShell({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)', background: 'var(--bg)' }}>
      {/* Slim left rail */}
      <nav style={{
        width: 56, background: 'var(--bg-raised)', borderRight: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '12px 0', gap: 2, flexShrink: 0,
      }}>
        {/* Logo */}
        <div
          onClick={() => navigate('/chat')}
          style={{
            width: 34, height: 34, borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, #D97706, #92400E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff',
            cursor: 'pointer', marginBottom: 8,
          }}
          data-tooltip="Genesis"
        >G</div>

        {NAV.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            data-tooltip={link.label}
            style={{
              width: 40, height: 40, borderRadius: 'var(--r-md)', border: 'none',
              background: location.pathname === link.path ? 'var(--bg-sunken)' : 'transparent',
              color: location.pathname === link.path ? 'var(--text-1)' : 'var(--text-3)',
              cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 130ms',
            }}
            onMouseEnter={e => { if (location.pathname !== link.path) e.currentTarget.style.background = 'rgba(28,25,23,0.05)' }}
            onMouseLeave={e => { if (location.pathname !== link.path) e.currentTarget.style.background = 'transparent' }}
          >{link.icon}</button>
        ))}
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

import { NavLink, useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'

const NAV = [
  { to: '/dashboard', icon: '▦', title: 'Dashboard'     },
  { to: '/chat',      icon: '⌨', title: 'Chat'          },
  { to: '/knowledge', icon: '⬡', title: 'Knowledge'     },
  { to: '/modules',   icon: '⊞', title: 'Modules'       },
  { to: '/timeline',  icon: '◷', title: 'Timeline'      },
  { to: '/voice',     icon: '◎', title: 'Voice'         },
  { to: '/admin',     icon: '⚙', title: 'Admin'         },
]

export default function Sidebar() {
  const { logout, openCmd, user } = useGenesisStore()
  const navigate = useNavigate()

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'GN'

  return (
    <aside
      style={{
        width: '52px',
        flexShrink: 0,
        background: 'var(--bg1)',
        borderRight: '1px solid var(--b0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '2px',
      }}
    >
      {/* Logo */}
      <div
        title="GENESIS"
        style={{
          width: 32, height: 32, borderRadius: 7,
          background: 'rgba(245,158,11,.1)',
          border: '1px solid rgba(245,158,11,.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, marginBottom: 10, cursor: 'default',
          boxShadow: '0 0 14px rgba(245,158,11,.12)',
        }}
      >
        🔥
      </div>

      {/* Nav links */}
      {NAV.map(({ to, icon, title }) => (
        <NavLink
          key={to}
          to={to}
          title={title}
          style={({ isActive }) => ({
            width: 36, height: 36, borderRadius: 6,
            background: isActive ? 'rgba(245,158,11,.1)' : 'transparent',
            border: `1px solid ${isActive ? 'rgba(245,158,11,.3)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isActive ? 'var(--acc)' : 'var(--t2)',
            fontSize: 14, textDecoration: 'none',
            transition: 'all .15s',
          })}
          onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--t1)' }}}
          onMouseLeave={e => { if (!e.currentTarget.style.background?.includes('245')) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)' }}}
        >
          {icon}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      {/* Command palette shortcut */}
      <button
        title="Command palette (⌘K)"
        onClick={openCmd}
        style={{
          width: 36, height: 36, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--t2)', fontSize: 12, border: '1px solid transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--acc)' }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)' }}
      >
        ⌘
      </button>

      {/* Avatar → logout */}
      <button
        title={`Signed in as ${user?.username || '?'}\nClick to sign out`}
        onClick={() => { logout(); navigate('/login') }}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(245,158,11,.12)',
          border: '1px solid rgba(245,158,11,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700,
          color: 'var(--acc)', marginTop: 6,
          transition: 'border-color .15s',
          fontFamily: '"IBM Plex Mono", monospace',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor='var(--acc)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='rgba(245,158,11,.25)'}
      >
        {initials}
      </button>
    </aside>
  )
}

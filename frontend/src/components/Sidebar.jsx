// frontend/src/components/Sidebar.jsx — v3 UPGRADE
// Full Claude.ai-style sidebar: search, conversation groups, model selector, nav links
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function RelativeTime({ iso }) {
  const d = new Date(iso), now = new Date(), diff = (now - d) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff/60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff/3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month:'short', day:'numeric' })
}

function groupConversations(conversations) {
  const now = new Date(), today = [], yesterday = [], thisWeek = [], older = []
  conversations.forEach(c => {
    const d = new Date(c.last_message_at || c.created_at || Date.now())
    const diff = (now - d) / 86400000
    if (diff < 1) today.push(c)
    else if (diff < 2) yesterday.push(c)
    else if (diff < 7) thisWeek.push(c)
    else older.push(c)
  })
  return [
    { label: 'Today', items: today },
    { label: 'Yesterday', items: yesterday },
    { label: 'This week', items: thisWeek },
    { label: 'Older', items: older },
  ].filter(g => g.items.length > 0)
}

const MODULE_COLORS = {
  m1: '#059669', m2: '#2563EB', m3: '#7C3AED', m4: '#D97706',
  m5: '#DC2626', m6: '#0891B2', m9: '#059669', core: '#78716C',
}

export default function Sidebar({
  user, conversations = [], activeConvId,
  onNewChat, onSelectConv, onDeleteConv, onLogout,
  trainedModules = [], onSelectModule,
  collapsed = false, onCollapse,
}) {
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef(null)

  const filtered = search.trim()
    ? conversations.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const groups = groupConversations(filtered)

  const navLinks = [
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { icon: '📚', label: 'Knowledge', path: '/knowledge' },
    { icon: '🧩', label: 'Modules', path: '/modules' },
    { icon: '⏱️', label: 'Timeline', path: '/timeline' },
    { icon: '🎙️', label: 'Voice', path: '/voice' },
    { icon: '⚡', label: 'Training Studio', path: '/training' },
  ]
  if (user?.is_admin) navLinks.push({ icon: '⚙️', label: 'Admin', path: '/admin' })

  return (
    <div style={{
      width: collapsed ? 0 : 'var(--sidebar-w, 268px)',
      minWidth: collapsed ? 0 : 'var(--sidebar-w, 268px)',
      background: 'var(--bg-raised)',
      borderRight: '1px solid var(--border-1)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0,
      overflow: collapsed ? 'hidden' : 'hidden',
      transition: 'width 0.22s ease, min-width 0.22s ease',
    }}>

      {/* Header */}
      <div style={{ padding: '14px 12px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div className="g-logo">G</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', color: 'var(--text-1)', flex: 1 }}>
            Genesis
          </span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onCollapse}
            style={{ color: 'var(--text-3)', flexShrink: 0 }}
            title="Toggle sidebar"
          >☰</button>
        </div>

        <button
          onClick={onNewChat}
          className="btn btn-outline"
          style={{ width: '100%', justifyContent: 'center', gap: 8, borderRadius: 'var(--r-md)' }}
        >
          <span style={{ fontSize: 16 }}>✦</span>
          New conversation
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: 'var(--text-4)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            ref={searchRef}
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            style={{ paddingLeft: 32, paddingRight: 10, fontSize: 13, height: 34 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 12, padding: 2 }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {conversations.length === 0 && !search && (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Start your first conversation with Genesis
            </p>
          </div>
        )}

        {search && filtered.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-4)', padding: '12px 10px' }}>No results for "{search}"</p>
        )}

        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-4)',
              padding: '10px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>{group.label}</p>

            {group.items.map(conv => {
              const isActive  = conv.id === activeConvId
              const isHovered = hoveredId === conv.id
              const modColor  = MODULE_COLORS[conv.module] || MODULE_COLORS.core

              return (
                <div
                  key={conv.id}
                  className="conv-item"
                  onClick={() => onSelectConv(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => { setHoveredId(null); setMenuOpen(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '7px 8px', borderRadius: 'var(--r-md)',
                    cursor: 'pointer', marginBottom: 1, position: 'relative',
                    background: isActive ? 'var(--bg-sunken)' : isHovered ? 'rgba(28,25,23,0.04)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 3, background: 'var(--brand)', borderRadius: '0 3px 3px 0',
                    }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                    <div style={{
                      fontSize: 14, fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 1,
                    }}>
                      {conv.title || 'New conversation'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
                        <RelativeTime iso={conv.last_message_at || conv.created_at} />
                      </span>
                      {conv.module && conv.module !== 'core' && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '0 5px',
                          borderRadius: 'var(--r-full)',
                          background: modColor + '20', color: modColor,
                        }}>{conv.module.toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  <div className="conv-actions" style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteConv(conv.id) }}
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--text-4)', width: 26, height: 26 }}
                      title="Delete"
                    >🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Trained modules */}
        {trainedModules.filter(m => m.is_active).length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', padding: '10px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Trained Models
            </p>
            {trainedModules.filter(m => m.is_active).map(m => (
              <button
                key={m.key}
                onClick={() => onSelectModule?.(m.key)}
                className="nav-item"
                style={{ paddingLeft: 8 }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 'var(--r-sm)',
                  background: MODULE_COLORS[m.domain] || '#78716C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{(m.domain || 'M')[0].toUpperCase()}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {m.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav links */}
      <div style={{ padding: '8px 8px 4px', borderTop: '1px solid var(--border-1)', flexShrink: 0 }}>
        {navLinks.map(link => (
          <button
            key={link.path}
            className={`nav-item${location.pathname === link.path ? ' active' : ''}`}
            onClick={() => navigate(link.path)}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{link.icon}</span>
            <span style={{ fontSize: 13 }}>{link.label}</span>
          </button>
        ))}
      </div>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid var(--border-1)',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div className="avatar avatar-sm" style={{ background: 'var(--brand-light)', color: 'var(--brand-hover)', flexShrink: 0 }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (user?.display_name?.[0] || user?.username?.[0] || 'U').toUpperCase()
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)' }}>
            {user?.display_name || user?.username || 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
            {user?.is_admin ? '✦ Admin' : 'Free plan'}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="btn btn-ghost btn-icon btn-sm"
          title="Log out"
          style={{ color: 'var(--text-4)' }}
        >→</button>
      </div>
    </div>
  )
}

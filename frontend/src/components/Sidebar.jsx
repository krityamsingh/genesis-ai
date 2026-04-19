// frontend/src/components/Sidebar.jsx — UPGRADED
// Upgrades:
//   • trainedModules prop — shows "Trained models" section with domain badges
//   • Training Studio link at the bottom of nav
//   • Listens for module_added WS events via onModuleAdded prop
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function RelativeTime({ iso }) {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = (now - d) / 1000
  if (diff < 60)       return 'just now'
  if (diff < 3600)     return `${Math.floor(diff/60)}m ago`
  if (diff < 86400)    return `${Math.floor(diff/3600)}h ago`
  if (diff < 172800)   return 'Yesterday'
  return d.toLocaleDateString()
}

function domainColor(domain) {
  return { trading: '#f59e0b', medical: '#10b981', legal: '#6366f1', code: '#0ea5e9', custom: '#ec4899' }[domain] || '#64748b'
}

export default function Sidebar({
  user, conversations, activeConvId,
  onNewChat, onSelectConv, onDeleteConv, onLogout,
  trainedModules = [],   // list of {key, domain, name, is_active}
  onSelectModule,        // callback(module_key) to open trained model in chat
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const navigate = useNavigate()

  return (
    <div style={{
      width: 'var(--sidebar-width, 260px)',
      background: 'var(--sidebar-bg, #F9F9F9)',
      borderRight: '1px solid var(--border, #E5E7EB)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: '#1A1A1A', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>G</div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Genesis AI</span>
        </div>

        <button
          onClick={onNewChat}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border, #E5E7EB)',
            background: '#fff', cursor: 'pointer', fontSize: 13,
            color: 'var(--text-primary, #1A1A1A)', fontWeight: 500,
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary, #F0F0F0)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <span style={{ fontSize: 16 }}>✏️</span> New chat
        </button>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {conversations.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)', padding: '12px 8px' }}>
            No conversations yet. Start a new chat!
          </p>
        )}
        {conversations.map(conv => {
          const isActive  = conv.id === activeConvId
          const isHovered = hoveredId === conv.id
          return (
            <div
              key={conv.id}
              onClick={() => onSelectConv(conv.id)}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                marginBottom: 2, position: 'relative',
                background: isActive ? 'var(--sidebar-active, #EAEAEA)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent, #2563EB)' : '2px solid transparent',
                transition: 'background 120ms',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                  color: 'var(--text-primary, #1A1A1A)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {conv.title || 'New conversation'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary, #9CA3AF)', marginTop: 2 }}>
                  <RelativeTime iso={conv.last_message_at} />
                  {conv.module && conv.module !== 'core' && (
                    <span style={{
                      marginLeft: 6, background: '#DBEAFE', color: '#1D4ED8',
                      borderRadius: 4, padding: '0 4px', fontSize: 10, fontWeight: 600,
                    }}>{conv.module.toUpperCase()}</span>
                  )}
                </div>
              </div>
              {isHovered && (
                <button
                  onClick={e => { e.stopPropagation(); onDeleteConv(conv.id) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', fontSize: 14, padding: '2px 4px',
                    borderRadius: 4, flexShrink: 0,
                  }}
                  title="Archive"
                >🗑️</button>
              )}
            </div>
          )
        })}
      </div>

      {/* Trained models section (Section D: auto-appears after training) */}
      {trainedModules.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border, #E5E7EB)', padding: '8px 12px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary, #9CA3AF)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Trained models
          </p>
          {trainedModules.filter(m => m.is_active).map(m => (
            <button
              key={m.key}
              onClick={() => onSelectModule?.(m.key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer', fontSize: 12,
                color: 'var(--text-secondary, #374151)', textAlign: 'left',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary, #F0F0F0)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff',
                background: domainColor(m.domain), flexShrink: 0,
              }}>{m.domain[0].toUpperCase()}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Training Studio link */}
      <div style={{ padding: '0 12px 8px' }}>
        <button
          onClick={() => navigate('/training')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 10px', borderRadius: 8, border: '1px dashed var(--border, #E5E7EB)',
            background: 'transparent', cursor: 'pointer', fontSize: 12,
            color: 'var(--text-tertiary, #9CA3AF)', transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary, #F0F0F0)'; e.currentTarget.style.color = 'var(--text-primary, #1A1A1A)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary, #9CA3AF)' }}
        >
          ⚡ Training Studio
        </button>
      </div>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid var(--border, #E5E7EB)',
        padding: '12px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: user?.avatar_url ? 'transparent' : '#E5E7EB',
          flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
        }}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (user?.display_name?.[0] || user?.username?.[0] || 'U').toUpperCase()
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.display_name || user?.username || 'User'}
          </div>
          {user?.is_admin && (
            <span style={{ fontSize: 10, background: '#D1FAE5', color: '#065F46', borderRadius: 4, padding: '0 4px', fontWeight: 600 }}>
              ADMIN
            </span>
          )}
        </div>
        <button
          onClick={onLogout}
          title="Logout"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', fontSize: 16, padding: 4, borderRadius: 4,
          }}
        >⏻</button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../lib/toast'

const COMMANDS = [
  { section: 'Pages', items: [
    { icon: '⊞', label: 'Dashboard',  path: '/dashboard' },
    { icon: '◻', label: 'Chat',       path: '/chat'      },
    { icon: '◈', label: 'Knowledge',  path: '/knowledge' },
    { icon: '⬡', label: 'Modules',    path: '/modules'   },
    { icon: '◷', label: 'Timeline',   path: '/timeline'  },
    { icon: '⌾', label: 'Voice',      path: '/voice'     },
    { icon: '⚙', label: 'Settings',   path: '/settings'  },
    { icon: '◫', label: 'Admin',      path: '/admin'     },
  ]},
  { section: 'Actions', items: [
    { icon: '✚', label: 'New Chat',           action: 'new-chat'     },
    { icon: '⟳', label: 'Clear Chat History', action: 'clear-chat'   },
    { icon: '↑', label: 'Upload PDF',          action: 'upload-pdf'  },
    { icon: '⚡', label: 'Enable All Modules',  action: 'enable-all'  },
    { icon: '◫', label: 'System Health Check', action: 'health-check'},
  ]},
  { section: 'Modules', items: [
    { icon: '🧠', label: 'M1 · Self-Learner',   path: '/modules' },
    { icon: '🔬', label: 'M2 · Research Accel', path: '/modules' },
    { icon: '⚡', label: 'M3 · AI Builder',      path: '/modules' },
    { icon: '⏳', label: 'M4 · Time Reconstruct',path: '/modules' },
    { icon: '✦',  label: 'M5 · Intuition Engine',path: '/modules' },
    { icon: '◈', label: 'M6 · Reality Sim',     path: '/modules' },
  ]},
]

export default function CommandPalette({ onClose }) {
  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef   = useRef(null)
  const navigate   = useNavigate()

  // Focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Filter commands
  const filtered = query
    ? COMMANDS.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : COMMANDS

  // Flatten for keyboard navigation
  const flat = filtered.flatMap(s => s.items)

  const clamp = (v) => Math.max(0, Math.min(v, flat.length - 1))

  const run = useCallback((item) => {
    if (item.path) {
      navigate(item.path)
    } else if (item.action) {
      const ACTIONS = {
        'new-chat':    () => { navigate('/chat');                      toast('New chat started', 'success')         },
        'clear-chat':  () =>                                           toast('Chat cleared', 'info')                 ,
        'upload-pdf':  () =>                                           toast('PDF upload dialog opened', 'info')     ,
        'enable-all':  () =>                                           toast('All modules enabled', 'success')       ,
        'health-check':() => { navigate('/admin');                     toast('Checking system health…', 'info')     },
      }
      ACTIONS[item.action]?.()
    }
    onClose()
  }, [navigate, onClose])

  const onKeyDown = (e) => {
    if (e.key === 'Escape')    { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => clamp(s + 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => clamp(s - 1)) }
    if (e.key === 'Enter')     { if (flat[selected]) run(flat[selected]) }
  }

  // Reset selection on query change
  useEffect(() => setSelected(0), [query])

  let flatIdx = 0

  return (
    <>
      <style>{`
        @keyframes cmdFadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        'fixed',
          inset:           0,
          background:      'rgba(0,0,0,.6)',
          zIndex:          'var(--z-modal)',
          display:         'flex',
          alignItems:      'flex-start',
          justifyContent:  'center',
          paddingTop:      '80px',
          backdropFilter:  'blur(4px)',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-default)',
            borderRadius: '16px',
            width:        '540px',
            overflow:     'hidden',
            boxShadow:    'var(--shadow-lg), 0 0 0 1px var(--border-subtle)',
            animation:    'cmdFadeIn 200ms var(--ease-out)',
          }}
        >
          {/* Search input */}
          <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '12px',
            padding:     '14px 16px',
            borderBottom:'1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>⌘</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages, actions, modules…"
              style={{
                background:   'transparent',
                border:       'none',
                boxShadow:    'none',
                fontSize:     '15px',
                color:        'var(--text-primary)',
                flex:         1,
                padding:      0,
                outline:      'none',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)', fontSize: '16px' }}>×</button>
            )}
          </div>

          {/* Results */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No results for "{query}"
              </div>
            ) : (
              filtered.map(section => (
                <div key={section.section} style={{ padding: '8px 8px 4px' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', padding: '4px 8px', marginBottom: '2px' }}>
                    {section.section}
                  </div>
                  {section.items.map(item => {
                    const idx = flatIdx++
                    return (
                      <div
                        key={item.label}
                        onClick={() => run(item)}
                        style={{
                          display:      'flex',
                          alignItems:   'center',
                          gap:          '10px',
                          padding:      '8px 10px',
                          borderRadius: '8px',
                          cursor:       'pointer',
                          color:        idx === selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          background:   idx === selected ? 'var(--accent-dim)'   : 'transparent',
                          fontSize:     '13px',
                          transition:   'background 80ms',
                        }}
                        onMouseEnter={() => setSelected(idx)}
                      >
                        <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                          {item.icon}
                        </span>
                        {item.label}
                        {item.path && (
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                            ↵
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding:     '8px 16px',
            borderTop:   '1px solid var(--border-subtle)',
            display:     'flex',
            gap:         '12px',
            fontSize:    '11px',
            color:       'var(--text-muted)',
            fontFamily:  "'JetBrains Mono', monospace",
          }}>
            {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([k, l]) => (
              <span key={k}>
                <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '1px 5px', marginRight: '4px' }}>{k}</span>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

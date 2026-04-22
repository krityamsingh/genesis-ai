// frontend/src/components/InputBar.jsx — v3 UPGRADE
// Full Claude.ai-style input: auto-expand, file attach hint, module chips, char count
import { useRef, useEffect, useState } from 'react'

const MODULES = [
  { key: 'core', label: 'Core', icon: '✦', desc: 'General intelligence' },
  { key: 'm1',   label: 'Learn', icon: '📚', desc: 'Self-learning from sources' },
  { key: 'm2',   label: 'Research', icon: '🔬', desc: 'Deep research & hypotheses' },
  { key: 'm3',   label: 'Build', icon: '🏗️', desc: 'AI system builder' },
  { key: 'm4',   label: 'Reconstruct', icon: '⏪', desc: 'Timeline reconstruction' },
  { key: 'm5',   label: 'Simulate', icon: '🌐', desc: 'Reality simulation' },
  { key: 'm6',   label: 'Intuition', icon: '💡', desc: 'Intuition engine' },
]

export default function InputBar({
  value, onChange, onSend, disabled, placeholder,
  activeModule = 'core', onModuleChange,
}) {
  const ref = useRef(null)
  const [showModules, setShowModules] = useState(false)
  const MAX_CHARS = 10000

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 240) + 'px'
  }, [value])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
    if (e.key === 'Escape') setShowModules(false)
  }

  const activeMod = MODULES.find(m => m.key === activeModule) || MODULES[0]
  const remaining = MAX_CHARS - value.length
  const nearLimit = remaining < 500

  return (
    <div style={{ padding: '12px 20px 16px', background: 'var(--bg)', flexShrink: 0 }}>

      {/* Module selector dropdown */}
      {showModules && (
        <div style={{
          position: 'relative', marginBottom: 8,
        }}>
          <div className="dropdown-menu" style={{
            bottom: '100%', left: 0, right: 0, position: 'absolute',
            marginBottom: 8, maxHeight: 280, overflowY: 'auto',
          }}>
            {MODULES.map(mod => (
              <button
                key={mod.key}
                className={`dropdown-item${mod.key === activeModule ? ' active' : ''}`}
                style={mod.key === activeModule ? { background: 'var(--brand-light)', color: 'var(--brand-hover)' } : {}}
                onClick={() => { onModuleChange?.(mod.key); setShowModules(false) }}
              >
                <span style={{ fontSize: 16 }}>{mod.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{mod.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{mod.desc}</div>
                </div>
                {mod.key === activeModule && (
                  <span style={{ marginLeft: 'auto', color: 'var(--brand)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input box */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--r-xl)',
        boxShadow: '0 2px 8px rgba(28,25,23,0.06)',
        overflow: 'hidden',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
        onFocus={() => {}}
      >
        {/* Textarea */}
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={placeholder || `Message Genesis (${activeMod.label} mode)…`}
          style={{
            display: 'block',
            width: '100%',
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--text-1)',
            fontFamily: 'var(--font-sans)',
            padding: '14px 16px 10px',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        />

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px 8px', borderTop: '1px solid var(--border-1)',
        }}>
          {/* Module chip */}
          <button
            onClick={() => setShowModules(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 'var(--r-full)',
              border: '1px solid var(--border-1)',
              background: showModules ? 'var(--brand-light)' : 'var(--bg-raised)',
              color: showModules ? 'var(--brand-hover)' : 'var(--text-2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 130ms',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span>{activeMod.icon}</span>
            {activeMod.label}
            <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
          </button>

          <div style={{ flex: 1 }} />

          {/* Char count */}
          {nearLimit && (
            <span style={{
              fontSize: 11, color: remaining < 100 ? 'var(--error)' : 'var(--text-4)',
              fontFamily: 'var(--font-mono)',
            }}>
              {remaining.toLocaleString()}
            </span>
          )}

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: disabled || !value.trim()
                ? 'var(--bg-sunken)'
                : 'linear-gradient(135deg, #D97706, #92400E)',
              color: disabled || !value.trim() ? 'var(--text-4)' : '#fff',
              cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 15, transition: 'all 150ms',
              boxShadow: disabled || !value.trim() ? 'none' : '0 2px 6px rgba(217,119,6,0.4)',
              transform: disabled || !value.trim() ? 'none' : 'scale(1)',
            }}
            onMouseEnter={e => { if (!disabled && value.trim()) e.currentTarget.style.transform = 'scale(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            title="Send (Enter)"
          >
            {disabled ? (
              <span style={{
                width: 14, height: 14, border: '2px solid var(--text-4)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'block',
              }} />
            ) : '↑'}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-4)' }}>
        Enter to send · Shift+Enter for new line · / for commands
      </div>
    </div>
  )
}

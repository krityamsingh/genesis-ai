// frontend/src/components/InputBar.jsx — NEW FILE
// Auto-expanding textarea. Enter sends, Shift+Enter newline. Disabled during streaming.
import { useRef, useEffect } from 'react'

export default function InputBar({ value, onChange, onSend, disabled, placeholder }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--bg-secondary, #F9F9F9)',
      borderTop: '1px solid var(--border, #E5E7EB)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        background: '#fff',
        border: '1px solid var(--border, #E5E7EB)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={placeholder || 'Message Genesis…'}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', fontSize: 14, lineHeight: 1.5,
            color: 'var(--text-primary)', fontFamily: 'inherit',
            maxHeight: 200, overflowY: 'auto',
            padding: '4px 0',
          }}
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          style={{
            width: 34, height: 34, borderRadius: 8, border: 'none',
            background: disabled || !value.trim() ? 'var(--bg-tertiary)' : 'var(--accent, #2563EB)',
            color: disabled || !value.trim() ? 'var(--text-tertiary)' : '#fff',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 16, transition: 'background 150ms',
          }}
          title="Send (Enter)"
        >↑</button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
        Enter to send · Shift+Enter for newline
      </div>
    </div>
  )
}

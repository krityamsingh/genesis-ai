// ── components/Toast.jsx ──────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { onToast } from '../lib/toast'

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    '◈',
  loading: '⟳',
}
const COLORS = {
  success: 'var(--green)',
  error:   'var(--red)',
  info:    'var(--accent)',
  loading: 'var(--amber)',
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    if (toast.type === 'loading') return
    const t = setTimeout(() => onRemove(toast.id), 4200)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       '1px solid var(--border-default)',
      borderRadius: '12px',
      padding:      '12px 16px',
      minWidth:     '300px',
      maxWidth:     '400px',
      boxShadow:    'var(--shadow-md)',
      animation:    'slideInToast .3s var(--ease-out)',
      display:      'flex',
      alignItems:   'flex-start',
      gap:          '10px',
      position:     'relative',
      overflow:     'hidden',
    }}>
      <span style={{ fontSize: '16px', color: COLORS[toast.type], marginTop: '1px', flexShrink: 0 }}>
        {ICONS[toast.type]}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{toast.msg}</div>
        {toast.sub && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{toast.sub}</div>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, flexShrink: 0 }}
      >×</button>
      {toast.type !== 'loading' && (
        <div style={{
          position:   'absolute',
          bottom:     0,
          left:       0,
          height:     '2px',
          borderRadius: '0 0 0 12px',
          background: COLORS[toast.type],
          animation:  'toastProgress 4s linear forwards',
        }} />
      )}
    </div>
  )
}

export default function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return onToast(event => {
      setToasts(prev => [...prev, event])
    })
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  if (!toasts.length) return null

  return (
    <>
      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div style={{
        position:      'fixed',
        bottom:        '20px',
        right:         '20px',
        zIndex:        'var(--z-toast)',
        display:       'flex',
        flexDirection: 'column',
        gap:           '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </>
  )
}

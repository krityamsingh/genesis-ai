// frontend/src/components/Toast.jsx — v3 UPGRADE
import { useEffect, useState } from 'react'

let _listeners = []
let _id = 0

export function toast(message, type = 'default', duration = 3500) {
  const id = ++_id
  _listeners.forEach(fn => fn({ id, message, type, duration }))
  return id
}
toast.success = (msg, dur) => toast(msg, 'success', dur)
toast.error   = (msg, dur) => toast(msg, 'error',   dur)
toast.info    = (msg, dur) => toast(msg, 'info',    dur)

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration)
    }
    _listeners.push(handler)
    return () => { _listeners = _listeners.filter(fn => fn !== handler) }
  }, [])

  const icons = { success: '✓', error: '✗', info: 'ℹ', default: '●' }
  const colors = {
    success: { bg: '#059669', color: '#fff' },
    error:   { bg: '#DC2626', color: '#fff' },
    info:    { bg: '#2563EB', color: '#fff' },
    default: { bg: '#1C1917', color: '#FAFAF8' },
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      zIndex: 10000,
    }}>
      {toasts.map(t => {
        const style = colors[t.type] || colors.default
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 16px', borderRadius: 'var(--r-md)',
            background: style.bg, color: style.color,
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
            boxShadow: '0 8px 24px rgba(28,25,23,0.18)',
            animation: 'fadeIn 0.2s ease', minWidth: 220, maxWidth: 380,
          }}>
            <span style={{ fontSize: 14 }}>{icons[t.type] || icons.default}</span>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

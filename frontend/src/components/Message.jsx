// frontend/src/components/Message.jsx — NEW FILE
// Renders a single chat message bubble. User: right-aligned. Assistant: left with avatar.
import { useState } from 'react'

export default function Message({ msg }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 10,
      marginBottom: 16,
    }}>
      {/* Avatar (assistant only) */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: '#1A1A1A', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, marginBottom: 2,
        }}>G</div>
      )}

      <div style={{ maxWidth: '80%', position: 'relative' }} className="msg-group">
        <div style={{
          padding: '11px 15px',
          borderRadius: isUser
            ? 'var(--user-bubble-radius, 18px 18px 4px 18px)'
            : 'var(--asst-bubble-radius, 4px 18px 18px 18px)',
          background: isUser ? 'var(--user-bubble-bg, #EFF6FF)' : 'transparent',
          border: isUser ? 'none' : '1px solid var(--border, #E5E7EB)',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary, #1A1A1A)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          position: 'relative',
        }}>
          {msg.content}

          {/* Copy button on assistant messages */}
          {!isUser && (
            <button
              onClick={copy}
              title="Copy"
              style={{
                position: 'absolute', top: 8, right: 8,
                background: copied ? '#D1FAE5' : 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '2px 7px', fontSize: 11, cursor: 'pointer',
                color: copied ? '#065F46' : 'var(--text-secondary)',
                opacity: 0, transition: 'opacity 150ms',
              }}
              className="copy-btn"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div style={{
          fontSize: 11, color: 'var(--text-tertiary, #9CA3AF)',
          textAlign: isUser ? 'right' : 'left',
          marginTop: 4, paddingLeft: isUser ? 0 : 4,
        }}>{time}</div>
      </div>

      <style>{`
        .msg-group:hover .copy-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

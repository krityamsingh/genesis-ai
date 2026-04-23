// frontend/src/components/Message.jsx — v3 UPGRADE
// Full Claude.ai-style message with markdown rendering, copy, code blocks, thinking indicator
import { useState, useMemo } from 'react'

// Minimal markdown renderer
function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered list items
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr />')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines
    .replace(/\n/g, '<br />')

  // Wrap list items in ul
  html = html.replace(/(<li>.*?<\/li>)+/gs, m => `<ul>${m}</ul>`)

  return `<p>${html}</p>`
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      style={{
        padding: '4px 10px', borderRadius: 'var(--r-sm)',
        fontSize: 12, border: '1px solid var(--border-1)',
        background: copied ? 'var(--success-bg)' : 'var(--bg-surface)',
        color: copied ? 'var(--success)' : 'var(--text-3)',
        cursor: 'pointer', transition: 'all 140ms',
        fontFamily: 'var(--font-sans)', fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'linear-gradient(135deg, #D97706, #92400E)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff',
        flexShrink: 0,
      }}>G</div>
      <div style={{ display: 'flex', gap: 5, padding: '12px 16px', background: 'var(--bg-raised)', borderRadius: 'var(--asst-radius)' }}>
        <div className="thinking-dot" />
        <div className="thinking-dot" />
        <div className="thinking-dot" />
      </div>
    </div>
  )
}

export function ThinkingMessage() {
  return (
    <div style={{ marginBottom: 20, animation: 'fadeIn 0.2s ease' }}>
      <ThinkingIndicator />
    </div>
  )
}

export default function Message({ msg }) {
  const [showActions, setShowActions] = useState(false)
  const isUser = msg.role === 'user'

  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  const hasMarkdown = !isUser && msg.content && (
    msg.content.includes('```') || msg.content.includes('**') ||
    msg.content.includes('# ') || msg.content.includes('- ') ||
    msg.content.includes('\n\n')
  )

  const htmlContent = useMemo(() => {
    if (!hasMarkdown) return null
    return renderMarkdown(msg.content)
  }, [msg.content, hasMarkdown])

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, animation: 'fadeIn 0.2s ease' }}>
        <div style={{ maxWidth: '78%' }}>
          <div style={{
            padding: '12px 16px',
            background: 'var(--user-bg)',
            border: '1px solid var(--user-border)',
            borderRadius: 'var(--user-radius)',
            fontSize: 15, lineHeight: 1.6,
            color: 'var(--text-1)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {msg.content}
          </div>
          {time && (
            <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'right', marginTop: 4, paddingRight: 4 }}>
              {time}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div
      style={{ display: 'flex', gap: 12, marginBottom: 24, animation: 'fadeIn 0.2s ease' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #D97706, #92400E)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff',
        marginTop: 2,
      }}>G</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Content */}
        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-1)' }}>
          {hasMarkdown ? (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content}
            </div>
          )}
        </div>

        {/* Actions row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
          opacity: showActions ? 1 : 0, transition: 'opacity 140ms',
        }}>
          <CopyButton text={msg.content} />
          {time && (
            <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>{time}</span>
          )}
        </div>
      </div>
    </div>
  )
}

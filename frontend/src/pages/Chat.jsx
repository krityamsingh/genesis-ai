import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import useGenesisStore from '../store/genesisStore'
import useWebSocket from '../hooks/useWebSocket'
import { toast } from '../lib/toast'

// ── Module config ─────────────────────────────────────────────────────────────
const MODULES = [
  { id: 'auto', label: '⚡ Auto',    color: 'var(--accent)' },
  { id: 'M1',   label: 'M1',        color: 'var(--green)'  },
  { id: 'M2',   label: 'M2',        color: 'var(--blue)'   },
  { id: 'M3',   label: 'M3',        color: 'var(--purple)' },
  { id: 'M4',   label: 'M4',        color: 'var(--amber)'  },
  { id: 'M5',   label: 'M5',        color: 'var(--pink)'   },
  { id: 'M6',   label: 'M6',        color: 'var(--red)'    },
]

// ── Suggestion prompts ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Explain quantum entanglement',
  'Build an ML pipeline in Python',
  'Summarize a research paper',
  'Simulate a market scenario',
]

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      style={{
        position:     'absolute',
        top:          '8px',
        right:        '8px',
        background:   'rgba(255,255,255,.08)',
        border:       '1px solid rgba(255,255,255,.12)',
        borderRadius: '6px',
        padding:      '3px 8px',
        fontSize:     '10px',
        color:        copied ? 'var(--green)' : 'var(--text-muted)',
        cursor:       'pointer',
        fontFamily:   "'JetBrains Mono', monospace",
        transition:   'color 150ms',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ language, children }) {
  const code = String(children).replace(/\n$/, '')
  return (
    <div style={{ position: 'relative', margin: '10px 0' }}>
      <div style={{
        background:   'var(--bg-elevated)',
        borderRadius: '10px 10px 0 0',
        border:       '1px solid var(--border-subtle)',
        borderBottom: 'none',
        padding:      '6px 14px',
        fontSize:     '11px',
        color:        'var(--text-muted)',
        fontFamily:   "'JetBrains Mono', monospace",
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        {language || 'code'}
        <CopyButton text={code} />
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin:       0,
          borderRadius: '0 0 10px 10px',
          border:       '1px solid var(--border-subtle)',
          fontSize:     '12px',
          lineHeight:   '1.7',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// ── Markdown components ───────────────────────────────────────────────────────
const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline ? (
      <CodeBlock language={match?.[1]}>{children}</CodeBlock>
    ) : (
      <code style={{
        background:   'var(--bg-elevated)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: '4px',
        padding:      '1px 5px',
        fontFamily:   "'JetBrains Mono', monospace",
        fontSize:     '12px',
        color:        'var(--accent-bright)',
      }} {...props}>{children}</code>
    )
  },
  p({ children }) {
    return <p style={{ marginBottom: '10px', lineHeight: '1.7' }}>{children}</p>
  },
  ul({ children }) {
    return <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>{children}</ul>
  },
  li({ children }) {
    return <li style={{ marginBottom: '4px', lineHeight: '1.6' }}>{children}</li>
  },
  strong({ children }) {
    return <strong style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{children}</strong>
  },
  table({ children }) {
    return (
      <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>{children}</table>
      </div>
    )
  },
  th({ children }) {
    return <th style={{ border: '1px solid var(--border-default)', padding: '8px 12px', background: 'var(--bg-elevated)', fontWeight: '500' }}>{children}</th>
  },
  td({ children }) {
    return <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{children}</td>
  },
}

// ── Module badge ──────────────────────────────────────────────────────────────
function ModuleBadge({ moduleId }) {
  const m = MODULES.find(m => m.id === moduleId) || MODULES[1]
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      padding:      '1px 7px',
      borderRadius: '9999px',
      fontSize:     '10px',
      fontWeight:   '600',
      fontFamily:   "'JetBrains Mono', monospace",
      background:   `${m.color}1a`,
      color:        m.color,
      border:       `1px solid ${m.color}44`,
    }}>
      {moduleId?.toUpperCase() || 'M1'}
    </span>
  )
}

// ── Message components ────────────────────────────────────────────────────────
function UserMessage({ content, username }) {
  const initials = username?.slice(0, 2).toUpperCase() || 'U'
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px', animation: 'pageFadeIn 200ms' }}>
      <div style={{
        maxWidth:     '70%',
        background:   'var(--accent-dim)',
        border:       '1px solid var(--border-accent)',
        borderRadius: '14px',
        padding:      '12px 16px',
        color:        'var(--text-primary)',
        lineHeight:   '1.5',
        fontSize:     '14px',
      }}>
        {content}
      </div>
      <div style={{
        width:          '30px',
        height:         '30px',
        borderRadius:   '50%',
        background:     'linear-gradient(135deg, var(--accent), var(--pink))',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '11px',
        fontWeight:     '600',
        flexShrink:     0,
        marginTop:      '2px',
      }}>
        {initials}
      </div>
    </div>
  )
}

function AIMessage({ content, moduleId, streaming, onRegenerate }) {
  const copyMessage = () => {
    navigator.clipboard.writeText(content).catch(() => {})
    toast('Copied to clipboard', 'success')
  }

  return (
    <div style={{ marginBottom: '24px', animation: 'pageFadeIn 200ms' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>🔥</span>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>GENESIS</span>
        <ModuleBadge moduleId={moduleId} />
      </div>

      {/* Body */}
      <div style={{ color: 'var(--text-primary)', maxWidth: '720px', fontSize: '14px' }}>
        <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
        {streaming && <span className="stream-cursor" />}
      </div>

      {/* Actions (after streaming) */}
      {!streaming && content && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {[
            { icon: '⊡', label: 'Copy',       action: copyMessage },
            { icon: '⟳', label: 'Regenerate', action: onRegenerate },
            { icon: '↑', label: 'Good' },
            { icon: '↓', label: 'Bad' },
          ].map(btn => (
            <button
              key={btn.label}
              className="btn btn-ghost"
              onClick={btn.action}
              style={{ fontSize: '11px', padding: '4px 10px' }}
              title={btn.label}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onSuggestion }) {
  return (
    <div style={{
      height:         '100%',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexDirection:  'column',
      gap:            '24px',
      padding:        '40px',
    }}>
      <div style={{
        width:          '64px',
        height:         '64px',
        background:     'linear-gradient(135deg, var(--accent), var(--pink))',
        borderRadius:   '50%',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '28px',
        boxShadow:      '0 0 40px var(--accent-glow)',
      }}>🔥</div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '600' }}>What do you want to learn today?</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>
          Ask GENESIS anything. It learns, reasons, and creates.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '500px', width: '100%' }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            style={{
              background:   'var(--bg-surface)',
              border:       '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding:      '12px 16px',
              fontSize:     '13px',
              color:        'var(--text-secondary)',
              cursor:       'pointer',
              textAlign:    'left',
              transition:   'all 150ms',
              fontFamily:   "'DM Sans', sans-serif",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-accent)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Chat() {
  const { user } = useGenesisStore()
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [module,    setModule]    = useState('auto')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const { sendMessage, lastToken, isConnected } = useWebSocket()

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Stream incoming tokens into the last AI message
  useEffect(() => {
    if (!lastToken) return
    setMessages(prev => {
      const msgs = [...prev]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'ai') {
        if (lastToken === '[DONE]') {
          last.streaming = false
          setStreaming(false)
        } else {
          last.content += lastToken
        }
      }
      return msgs
    })
  }, [lastToken])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Optimistic user message
    setMessages(prev => [
      ...prev,
      { id: Date.now(),   role: 'user', content: text },
      { id: Date.now()+1, role: 'ai',  content: '', streaming: true, module },
    ])
    setStreaming(true)

    // Send via WebSocket
    sendMessage({ message: text, module })
  }, [input, streaming, module, sendMessage])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleSuggestion = (s) => {
    setInput(s)
    textareaRef.current?.focus()
  }

  const regenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setMessages(prev => prev.filter(m => m.id !== prev[prev.length - 1].id))
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { id: Date.now(), role: 'ai', content: '', streaming: true, module },
      ])
      setStreaming(true)
      sendMessage({ message: lastUser.content, module })
    }, 50)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding:       '0 20px',
        height:        '48px',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        borderBottom:  '1px solid var(--border-subtle)',
        flexShrink:    0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Module:</span>
          <div className="badge badge-accent">
            {MODULES.find(m => m.id === module)?.label || 'Auto'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isConnected && (
            <span className="badge badge-amber">⚠ Disconnected</span>
          )}
          <button className="btn btn-ghost" onClick={() => setMessages([])} style={{ fontSize: '11px', padding: '4px 10px' }}>
            Clear
          </button>
        </div>
      </div>

      {/* Message area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {messages.length === 0 ? (
          <EmptyState onSuggestion={handleSuggestion} />
        ) : (
          messages.map(m => m.role === 'user' ? (
            <UserMessage key={m.id} content={m.content} username={user?.username} />
          ) : (
            <AIMessage
              key={m.id}
              content={m.content}
              moduleId={m.module}
              streaming={m.streaming}
              onRegenerate={regenerate}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding:     '12px 20px 16px',
        borderTop:   '1px solid var(--border-subtle)',
        background:  'var(--bg-subtle)',
        flexShrink:  0,
      }}>
        {/* Module chips */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setModule(m.id)}
              style={{
                padding:      '4px 10px',
                borderRadius: '9999px',
                border:       `1px solid ${module === m.id ? 'var(--border-accent)' : 'var(--border-default)'}`,
                fontSize:     '11px',
                fontWeight:   '500',
                color:        module === m.id ? 'var(--accent-bright)' : 'var(--text-muted)',
                background:   module === m.id ? 'var(--accent-dim)' : 'transparent',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                transition:   'all 120ms',
                fontFamily:   "'DM Sans', sans-serif",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Textarea + send */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onInput={autoResize}
            placeholder="Message GENESIS..."
            rows={1}
            style={{ flex: 1, resize: 'none', minHeight: '46px', maxHeight: '120px', lineHeight: '1.5', padding: '12px 16px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            style={{
              width:          '44px',
              height:         '44px',
              borderRadius:   '12px',
              background:     streaming ? 'var(--bg-overlay)' : 'var(--accent)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
              fontSize:       '18px',
              color:          '#fff',
              border:         'none',
              cursor:         input.trim() && !streaming ? 'pointer' : 'not-allowed',
              opacity:        input.trim() && !streaming ? 1 : 0.5,
              transition:     'all 150ms',
            }}
          >
            {streaming ? <div className="spinner" style={{ borderTopColor: 'var(--accent)', background: 'transparent' }} /> : '↑'}
          </button>
        </div>

        {/* Hint */}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
          {input.length > 500 && <span style={{ marginLeft: '8px', color: input.length > 900 ? 'var(--amber)' : undefined }}>{input.length} chars</span>}
        </div>
      </div>
    </div>
  )
}

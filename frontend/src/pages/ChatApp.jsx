// frontend/src/pages/ChatApp.jsx — v3 UPGRADE
// Full Claude.ai-style chat shell with welcome screen, streaming, split view
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Message, { ThinkingMessage } from '../components/Message'
import InputBar from '../components/InputBar'
import useAuth from '../hooks/useAuth'
import useConversations from '../hooks/useConversations'
import '../styles/design-system.css'

const SUGGESTIONS = [
  { icon: '🧠', text: 'Explain quantum entanglement in simple terms' },
  { icon: '💻', text: 'Write a Python script to parse and analyze CSV data' },
  { icon: '🔬', text: 'Summarize the latest research on large language models' },
  { icon: '📝', text: 'Help me write a professional email declining a meeting' },
  { icon: '🏗️', text: 'Design a microservices architecture for an e-commerce app' },
  { icon: '📊', text: 'Create a data visualization plan for sales metrics' },
]

function WelcomeScreen({ user, onSuggestion }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = user?.display_name || user?.username

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 680, width: '100%', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
          borderRadius: 'var(--r-xl)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24,
          fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff',
          boxShadow: '0 4px 16px rgba(217,119,6,0.3)',
        }}>G</div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 'normal',
          color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.2,
        }}>
          {greeting}{name ? `, ${name}` : ''}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-3)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
          How can Genesis help you today?
        </p>

        {/* Suggestion chips */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10, textAlign: 'left',
        }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(s.text)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 16px', borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-1)',
                background: 'var(--bg-surface)', cursor: 'pointer',
                textAlign: 'left', transition: 'all 160ms',
                animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-glow)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-1)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TopBar({ conv, sidebarOpen, onToggleSidebar, user }) {
  return (
    <div style={{
      height: 52, padding: '0 16px',
      borderBottom: '1px solid var(--border-1)',
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--bg-surface)', flexShrink: 0,
    }}>
      {!sidebarOpen && (
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onToggleSidebar}
          style={{ color: 'var(--text-3)', marginRight: 4 }}
          title="Open sidebar"
        >☰</button>
      )}

      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text-2)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>
        {conv?.title || 'Genesis AI'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {conv?.module && conv.module !== 'core' && (
          <span className="badge badge-brand">{conv.module.toUpperCase()}</span>
        )}
        {user?.is_admin && (
          <a href="/admin" className="badge badge-neutral" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            Admin
          </a>
        )}
      </div>
    </div>
  )
}

export default function ChatApp() {
  const navigate = useNavigate()
  const { user, loading, authed, logout, authHeaders } = useAuth()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [activeModule, setActiveModule] = useState('core')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef(null)
  const abortRef = useRef(null)

  const {
    conversations, activeConvId, messages,
    loadingConvs, loadingMessages,
    createConversation, selectConversation,
    sendMessage, deleteConversation,
  } = useConversations(authHeaders, authed)

  useEffect(() => {
    if (!loading && !authed) navigate('/login', { replace: true })
  }, [loading, authed, navigate])

  useEffect(() => {
    if (user?.needs_name_setup) navigate('/setup-name', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSuggestion = (text) => {
    setInput(text)
    setTimeout(() => {
      // auto-focus textarea
      document.querySelector('textarea')?.focus()
    }, 50)
  }

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || sending) return

    let convId = activeConvId
    if (!convId) {
      try {
        const conv = await createConversation(activeModule)
        convId = conv.id
      } catch { return }
    }

    setInput('')
    setSending(true)

    try {
      await sendMessage(convId, content, activeModule)
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setSending(false)
    }
  }, [input, sending, activeConvId, activeModule, createConversation, sendMessage])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const activeConv = conversations.find(c => c.id === activeConvId)

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #D97706, #92400E)',
            borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20,
            fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>G</div>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading Genesis…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <Sidebar
        user={user}
        conversations={conversations}
        activeConvId={activeConvId}
        onNewChat={() => createConversation(activeModule).catch(() => {})}
        onSelectConv={selectConversation}
        onDeleteConv={deleteConversation}
        onLogout={handleLogout}
        collapsed={!sidebarOpen}
        onCollapse={() => setSidebarOpen(s => !s)}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        <TopBar
          conv={activeConv}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(s => !s)}
          user={user}
        />

        {/* Messages or Welcome */}
        {!activeConvId && messages.length === 0 ? (
          <WelcomeScreen user={user} onSuggestion={handleSuggestion} />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
            <div style={{ maxWidth: 'var(--chat-max, 720px)', margin: '0 auto', padding: '0 20px' }}>

              {loadingMessages && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 0' }}>
                  {[90, 60, 80].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 16, width: `${w}%` }} />
                  ))}
                </div>
              )}

              {messages.map(msg => (
                <Message key={msg.id || msg.ts} msg={msg} />
              ))}

              {sending && <ThinkingMessage />}

              <div ref={bottomRef} style={{ height: 8 }} />
            </div>
          </div>
        )}

        {/* Input */}
        <InputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={sending}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
      </div>
    </div>
  )
}

// frontend/src/pages/ChatApp.jsx — NEW FILE
// Main shell: Sidebar (260px) + ChatArea. Manages conversations and messages.
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar   from '../components/Sidebar'
import Message   from '../components/Message'
import InputBar  from '../components/InputBar'
import useAuth   from '../hooks/useAuth'
import useConversations from '../hooks/useConversations'
import '../styles/design-system.css'

export default function ChatApp() {
  const navigate = useNavigate()
  const { user, loading, authed, logout, authHeaders } = useAuth()
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [activeModule, setActiveModule] = useState('core')
  const bottomRef = useRef(null)

  const {
    conversations, activeConvId, messages,
    loadingConvs, loadingMessages,
    createConversation, selectConversation,
    sendMessage, deleteConversation,
  } = useConversations(authHeaders, authed)

  // Redirect to login if not authed
  useEffect(() => {
    if (!loading && !authed) navigate('/login', { replace: true })
  }, [loading, authed, navigate])

  // Redirect to name setup if needed
  useEffect(() => {
    if (user?.needs_name_setup) navigate('/setup-name', { replace: true })
  }, [user, navigate])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = async () => {
    try { await createConversation(activeModule) }
    catch (e) { console.error('New chat failed:', e) }
  }

  const handleSend = async () => {
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
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <Sidebar
        user={user}
        conversations={conversations}
        activeConvId={activeConvId}
        onNewChat={handleNewChat}
        onSelectConv={selectConversation}
        onDeleteConv={deleteConversation}
        onLogout={handleLogout}
      />

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>

        {/* Topbar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            {conversations.find(c => c.id === activeConvId)?.title || 'Genesis AI'}
          </span>
          <div style={{ flex: 1 }} />
          {/* Module selector */}
          <select
            value={activeModule}
            onChange={e => setActiveModule(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
              fontSize: 12, background: '#fff', color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            <option value="core">Core</option>
            <option value="m1">M1 Learn</option>
            <option value="m2">M2 Research</option>
            <option value="m3">M3 Build</option>
            <option value="m4">M4 Reconstruct</option>
            <option value="m5">M5 Simulate</option>
            <option value="m6">M6 Expand</option>
          </select>

          {user?.is_admin && (
            <a href="/admin" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Admin Panel
            </a>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
          <div style={{ maxWidth: 'var(--chat-max-width, 740px)', margin: '0 auto', padding: '0 24px' }}>

            {!activeConvId && messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 80 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                  Hello{user?.display_name ? `, ${user.display_name}` : ''}!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  Start a new conversation or select one from the sidebar.
                </p>
              </div>
            )}

            {loadingMessages && (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 40 }}>
                Loading messages…
              </div>
            )}

            {messages.map(msg => (
              <Message key={msg.id} msg={msg} />
            ))}

            {sending && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#1A1A1A', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>G</div>
                <div style={{
                  padding: '11px 15px', border: '1px solid var(--border)',
                  borderRadius: 'var(--asst-bubble-radius, 4px 18px 18px 18px)',
                  fontSize: 14, color: 'var(--text-tertiary)',
                }}>
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <InputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={sending}
        />
      </div>
    </div>
  )
}

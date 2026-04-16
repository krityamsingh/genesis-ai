import { useState, useEffect, useRef } from 'react'
import useGenesisStore from '../store/genesisStore'
import useWebSocket    from '../hooks/useWebSocket'
import Badge           from '../components/Badge'
import StatusDot       from '../components/StatusDot'
import Loader          from '../components/Loader'

const MODULES = [
  { id: 'auto', label: 'Auto',      color: '#F59E0B' },
  { id: 'm1',   label: 'M1 Learn',  color: '#10B981' },
  { id: 'm2',   label: 'M2 Research',color: '#60A5FA' },
  { id: 'm3',   label: 'M3 Builder',color: '#8B5CF6' },
  { id: 'm4',   label: 'M4 Time',   color: '#F59E0B' },
  { id: 'm5',   label: 'M5 Intuition',color:'#F97316'},
  { id: 'm6',   label: 'M6 Sim',    color: '#F43F5E' },
]

const MOD_COLOR = Object.fromEntries(MODULES.map(m => [m.id, m.color]))

export default function Chat() {
  const {
    messages, streaming, streamText,
    chatModule, setChatModule,
    addMessage, clearMessages,
  } = useGenesisStore()

  const { sendQuery, connected } = useWebSocket()

  const [input,   setInput]   = useState('')
  const [srcBar,  setSrcBar]  = useState(false)
  const [srcVal,  setSrcVal]  = useState('')
  const bottomRef             = useRef(null)
  const taRef                 = useRef(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  const send = () => {
    const q = input.trim()
    if (!q || streaming) return
    addMessage({ role: 'user', content: q })
    setInput('')
    sendQuery(q, chatModule)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Topbar */}
      <div style={{
        padding:'8px 14px', background:'var(--bg1)', borderBottom:'1px solid var(--b0)',
        display:'flex', alignItems:'center', gap:8, flexShrink:0,
      }}>
        <span style={{ fontSize:12, color:'var(--t1)' }}>⌨ GENESIS Chat</span>

        {/* Module tabs */}
        <div style={{ display:'flex', gap:3, marginLeft:8, overflowX:'auto' }}>
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setChatModule(m.id)}
              style={{
                padding:'3px 9px', fontSize:10, borderRadius:3, whiteSpace:'nowrap',
                background: chatModule===m.id ? `${m.color}18` : 'transparent',
                color:      chatModule===m.id ? m.color : 'var(--t2)',
                border:     `1px solid ${chatModule===m.id ? m.color+'44' : 'transparent'}`,
                fontFamily:'"IBM Plex Mono",monospace',
                transition:'all .15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <StatusDot color={connected ? 'var(--gr)' : 'var(--rd)'} pulse={connected} />
          <span style={{ fontSize:9, color:'var(--t2)' }}>{connected ? 'ws connected' : 'reconnecting...'}</span>
          <button
            className="g-btn"
            onClick={() => setSrcBar(s=>!s)}
            style={{ padding:'4px 9px', fontSize:10 }}
          >
            ⬇ Learn
          </button>
          <button
            className="g-btn"
            onClick={clearMessages}
            style={{ padding:'4px 9px', fontSize:10 }}
          >
            ✕ Clear
          </button>
        </div>
      </div>

      {/* Inline learn bar */}
      {srcBar && (
        <div className="animate-fadein" style={{
          padding:'8px 14px', background:'var(--bg2)', borderBottom:'1px solid var(--b0)',
          display:'flex', gap:8,
        }}>
          <input
            value={srcVal}
            onChange={e=>setSrcVal(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&setSrcBar(false)}
            placeholder="Feed a URL or text to M1..."
            style={{ flex:1, padding:'6px 10px', fontSize:11 }}
          />
          <button className="g-btn-primary" style={{ padding:'6px 12px', fontSize:11 }}
            onClick={()=>{ addMessage({role:'user',content:`learn: ${srcVal}`}); sendQuery(`learn: ${srcVal}`, 'm1'); setSrcVal(''); setSrcBar(false) }}>
            ⬇ Ingest
          </button>
          <button className="g-btn" style={{ padding:'6px 10px', fontSize:11 }}
            onClick={()=>setSrcBar(false)}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}

        {/* Streaming bubble */}
        {streaming && (
          <div className="animate-fadein" style={{ display:'flex', gap:8 }}>
            <Avatar />
            <div style={{
              maxWidth:'72%', padding:'9px 11px',
              background:'var(--bg2)', border:'1px solid var(--b0)',
              borderRadius:'2px 7px 7px 7px',
              fontSize:11, lineHeight:1.75, fontFamily:'"IBM Plex Mono",monospace',
              color:'var(--t0)', whiteSpace:'pre-wrap',
            }}>
              {streamText}
              <span className="animate-blink" style={{ color:'var(--acc)', marginLeft:1 }}>▊</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding:'10px 12px', background:'var(--bg1)', borderTop:'1px solid var(--b0)', flexShrink:0 }}>
        <div style={{
          display:'flex', gap:7, alignItems:'flex-end',
          background:'var(--bg2)', border:'1px solid var(--b1)',
          borderRadius:7, padding:7,
        }}>
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(e) }}
            onKeyDown={onKey}
            placeholder="Ask anything... (Shift+↵ for newline)"
            style={{
              flex:1, background:'transparent', border:'none', resize:'none',
              fontSize:12, lineHeight:1.6, color:'var(--t0)', outline:'none',
              fontFamily:'"IBM Plex Mono",monospace', padding:'2px 4px',
              overflowY:'hidden',
            }}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            style={{
              width:30, height:30, borderRadius:5,
              background: streaming || !input.trim() ? 'var(--b1)' : 'var(--acc)',
              color: streaming || !input.trim() ? 'var(--t2)' : 'var(--bg0)',
              border:'none', display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0, fontSize:13, transition:'all .15s',
            }}
          >
            {streaming ? <Loader size={12} color="var(--t2)" /> : '▶'}
          </button>
        </div>
        <div style={{ marginTop:5, fontSize:10, color:'var(--t2)', display:'flex', gap:10 }}>
          <span>↵ send</span>
          <span>⇧↵ newline</span>
          <span style={{ marginLeft:'auto', color:'var(--acc)' }}>⌘K</span>
        </div>
      </div>
    </div>
  )
}

function Avatar() {
  return (
    <div style={{
      width:22, height:22, borderRadius:3, flexShrink:0, marginTop:1,
      background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:10,
    }}>
      🔥
    </div>
  )
}

function UserAvatar() {
  const { user } = useGenesisStore()
  return (
    <div style={{
      width:22, height:22, borderRadius:3, flexShrink:0, marginTop:1,
      background:'rgba(96,165,250,.1)', border:'1px solid rgba(96,165,250,.25)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:9, fontWeight:700, color:'var(--bl)',
      fontFamily:'"IBM Plex Mono",monospace',
    }}>
      {(user?.username||'U').slice(0,2).toUpperCase()}
    </div>
  )
}

function ChatMessage({ msg }) {
  const isUser   = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const modColor = msg.module ? MOD_COLOR[msg.module] || 'var(--acc)' : null

  if (isSystem) {
    return (
      <div className="animate-fadein" style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'6px 10px', borderRadius:4,
        background:'var(--bg2)', border:'1px solid var(--b0)',
        fontSize:10, color:'var(--t2)', fontFamily:'"IBM Plex Mono",monospace',
      }}>
        <span style={{ color:'var(--acc)' }}>⚡</span>
        {msg.content}
      </div>
    )
  }

  return (
    <div className="animate-fadein" style={{
      display:'flex', gap:8,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    }}>
      {!isUser && <Avatar />}
      <div style={{
        maxWidth:'72%', padding:'9px 11px',
        background: isUser ? 'rgba(245,158,11,.08)' : 'var(--bg2)',
        border:     `1px solid ${isUser ? 'rgba(245,158,11,.22)' : 'var(--b0)'}`,
        borderRadius: isUser ? '7px 7px 2px 7px' : '2px 7px 7px 7px',
        fontSize:11, lineHeight:1.75,
        fontFamily:'"IBM Plex Mono",monospace',
        color:'var(--t0)', whiteSpace:'pre-wrap', wordBreak:'break-word',
      }}>
        {modColor && (
          <div style={{ marginBottom:5 }}>
            <Badge text={msg.module.toUpperCase()} color={modColor} small />
          </div>
        )}
        {msg.content}
      </div>
      {isUser && <UserAvatar />}
    </div>
  )
}

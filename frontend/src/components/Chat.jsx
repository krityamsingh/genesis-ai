import { useState, useRef, useEffect, useCallback } from 'react'
import useGenesisStore from '../store/genesisStore'
import useWebSocket from '../hooks/useWebSocket'
import { toast } from '../lib/toast'

// ── Module config ─────────────────────────────────────────────────────────────
const MODULES = [
  { id: 'auto', label: '⚡ Auto', color: 'var(--accent)'  },
  { id: 'M1',   label: 'M1',     color: 'var(--green)'   },
  { id: 'M2',   label: 'M2',     color: 'var(--blue)'    },
  { id: 'M3',   label: 'M3',     color: 'var(--purple)'  },
  { id: 'M4',   label: 'M4',     color: 'var(--amber)'   },
  { id: 'M5',   label: 'M5',     color: 'var(--pink)'    },
  { id: 'M6',   label: 'M6',     color: 'var(--red)'     },
]

const SUGGESTIONS = [
  'Explain quantum entanglement',
  'Build an ML pipeline in Python',
  'Summarize a research paper',
  'Simulate a market scenario',
]

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight inline markdown renderer — no external deps
// Supports: fenced code blocks, headings, unordered/ordered lists,
//           blockquotes, bold, italic, inline code, paragraphs
// ─────────────────────────────────────────────────────────────────────────────

let _k = 0
const key = () => String(++_k)

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      position: 'absolute', top: '8px', right: '8px',
      background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
      borderRadius: '6px', padding: '3px 8px', fontSize: '10px',
      color: done ? 'var(--green)' : 'var(--text-muted)',
      cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", transition: 'color 150ms',
    }}>
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// Parse inline formatting: **bold**, *italic*, `code`
function Inline({ text }) {
  const parts = []
  const re = /(`[^`\n]+`|\*\*[\s\S]+?\*\*|\*[^*\n]+\*)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key()}>{text.slice(last, m.index)}</span>)
    const raw = m[0]
    if (raw.startsWith('`'))  parts.push(<code key={key()} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:'4px', padding:'1px 5px', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'var(--accent-bright)' }}>{raw.slice(1,-1)}</code>)
    else if (raw.startsWith('**')) parts.push(<strong key={key()} style={{ color:'var(--text-primary)', fontWeight:'600' }}>{raw.slice(2,-2)}</strong>)
    else parts.push(<em key={key()} style={{ fontStyle:'italic' }}>{raw.slice(1,-1)}</em>)
    last = m.index + raw.length
  }
  if (last < text.length) parts.push(<span key={key()}>{text.slice(last)}</span>)
  return <>{parts}</>
}

function Markdown({ text }) {
  if (!text) return null
  const blocks = []
  const lines  = (text || '').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'code'
      const src  = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { src.push(lines[i]); i++ }
      const code = src.join('\n')
      blocks.push(
        <div key={key()} style={{ position:'relative', margin:'12px 0' }}>
          <div style={{ background:'var(--bg-elevated)', borderRadius:'10px 10px 0 0', border:'1px solid var(--border-subtle)', borderBottom:'none', padding:'6px 14px', fontSize:'11px', color:'var(--text-muted)', fontFamily:"'JetBrains Mono',monospace", display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {lang}
            <CopyBtn text={code} />
          </div>
          <pre style={{ margin:0, padding:'14px 16px', background:'#1a1b26', border:'1px solid var(--border-subtle)', borderRadius:'0 0 10px 10px', fontSize:'12px', lineHeight:'1.7', overflowX:'auto', fontFamily:"'JetBrains Mono',monospace", color:'#a9b1d6', whiteSpace:'pre' }}>
            {code}
          </pre>
        </div>
      )
      i++
      continue
    }

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)/)
    if (hm) {
      const sz = ['18px','16px','14px'][hm[1].length - 1]
      blocks.push(<div key={key()} style={{ fontSize:sz, fontWeight:'600', color:'var(--text-primary)', margin:'14px 0 6px' }}><Inline text={hm[2]} /></div>)
      i++; continue
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key()} style={{ border:'none', borderTop:'1px solid var(--border-subtle)', margin:'14px 0' }} />)
      i++; continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const qls = []
      while (i < lines.length && lines[i].startsWith('> ')) { qls.push(lines[i].slice(2)); i++ }
      blocks.push(<div key={key()} style={{ borderLeft:'3px solid var(--accent)', paddingLeft:'14px', margin:'10px 0', color:'var(--text-secondary)', fontStyle:'italic' }}>{qls.map(l => <div key={key()}><Inline text={l} /></div>)}</div>)
      continue
    }

    // Unordered list
    if (/^[ ]*[-*+] /.test(line)) {
      const items = []
      while (i < lines.length && /^[ ]*[-*+] /.test(lines[i])) { items.push(lines[i].replace(/^[ ]*[-*+] /, '')); i++ }
      blocks.push(<ul key={key()} style={{ paddingLeft:'20px', marginBottom:'10px' }}>{items.map(t => <li key={key()} style={{ marginBottom:'4px', lineHeight:'1.6' }}><Inline text={t} /></li>)}</ul>)
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      blocks.push(<ol key={key()} style={{ paddingLeft:'20px', marginBottom:'10px' }}>{items.map(t => <li key={key()} style={{ marginBottom:'4px', lineHeight:'1.6' }}><Inline text={t} /></li>)}</ol>)
      continue
    }

    // Empty line
    if (line.trim() === '') { i++; continue }

    // Paragraph — consume until blank / code / heading / list
    const pl = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('#') &&
      !/^[ ]*[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) { pl.push(lines[i]); i++ }

    if (pl.length) {
      blocks.push(<p key={key()} style={{ marginBottom:'10px', lineHeight:'1.7', color:'var(--text-primary)' }}><Inline text={pl.join(' ')} /></p>)
    }
  }

  return <>{blocks}</>
}

// ── Module badge ──────────────────────────────────────────────────────────────
function ModuleBadge({ moduleId }) {
  const m = MODULES.find(x => x.id === moduleId) || MODULES[1]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'1px 7px', borderRadius:'9999px', fontSize:'10px', fontWeight:'600', fontFamily:"'JetBrains Mono',monospace", background:`${m.color}1a`, color:m.color, border:`1px solid ${m.color}44` }}>
      {(moduleId || 'M1').toUpperCase()}
    </span>
  )
}

// ── Message components ────────────────────────────────────────────────────────
function UserMessage({ content, username }) {
  const initials = (username || 'U').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginBottom:'20px' }}>
      <div style={{ maxWidth:'70%', background:'var(--accent-dim)', border:'1px solid var(--border-accent)', borderRadius:'14px', padding:'12px 16px', lineHeight:'1.5', fontSize:'14px' }}>
        {content}
      </div>
      <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),#EC4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'600', flexShrink:0, marginTop:'2px' }}>
        {initials}
      </div>
    </div>
  )
}

function AIMessage({ content, moduleId, streaming, onRegenerate }) {
  const copy = () => { navigator.clipboard.writeText(content).catch(() => {}); toast('Copied','success') }
  return (
    <div style={{ marginBottom:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
        <span>🔥</span>
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--accent)' }}>GENESIS</span>
        <ModuleBadge moduleId={moduleId} />
      </div>
      <div style={{ fontSize:'14px', maxWidth:'720px' }}>
        <Markdown text={content} />
        {streaming && <span style={{ display:'inline-block', color:'var(--accent)', animation:'blink .8s step-end infinite' }}>▌</span>}
      </div>
      {!streaming && content && (
        <div style={{ display:'flex', gap:'6px', marginTop:'10px' }}>
          {[['⊡','Copy',copy],['⟳','Regenerate',onRegenerate],['↑','Good',null],['↓','Bad',null]].map(([ico,lbl,fn]) => (
            <button key={lbl} onClick={fn || undefined} title={lbl}
              style={{ padding:'4px 10px', borderRadius:'8px', border:'1px solid var(--border-default)', background:'transparent', color:'var(--text-muted)', fontSize:'11px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--bg-overlay)'; e.currentTarget.style.color='var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}
            >{ico}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onSuggestion }) {
  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'24px', padding:'40px' }}>
      <div style={{ width:'64px', height:'64px', background:'linear-gradient(135deg,var(--accent),#EC4899)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', boxShadow:'0 0 40px var(--accent-glow)' }}>🔥</div>
      <div style={{ textAlign:'center' }}>
        <h2 style={{ fontSize:'22px', fontWeight:'600' }}>What do you want to learn today?</h2>
        <p style={{ fontSize:'14px', color:'var(--text-secondary)', marginTop:'6px' }}>Ask GENESIS anything. It learns, reasons, and creates.</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', maxWidth:'500px', width:'100%' }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => onSuggestion(s)}
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'12px', padding:'12px 16px', fontSize:'13px', color:'var(--text-secondary)', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif", transition:'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-accent)'; e.currentTarget.style.color='var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.color='var(--text-secondary)' }}
          >{s}</button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Chat() {
  const { user }    = useGenesisStore()
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [module,    setModule]    = useState('auto')
  const [streaming, setStreaming] = useState(false)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const streamIdx   = useRef(null)
  const { sendMessage, lastToken, isConnected } = useWebSocket()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  useEffect(() => {
    if (!lastToken || streamIdx.current === null) return
    setMessages(prev => {
      const msgs = [...prev]
      const msg  = msgs[streamIdx.current]
      if (!msg || msg.role !== 'ai') return prev
      if (lastToken === '[DONE]') {
        msg.streaming = false
        setStreaming(false)
        streamIdx.current = null
      } else {
        msg.content = (msg.content || '') + lastToken
      }
      return [...msgs]
    })
  }, [lastToken])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => {
      const next = [
        ...prev,
        { id: Date.now(),   role:'user', content:text },
        { id: Date.now()+1, role:'ai',   content:'', streaming:true, module },
      ]
      streamIdx.current = next.length - 1
      return next
    })
    setStreaming(true)
    sendMessage({ message:text, module })
  }, [input, streaming, module, sendMessage])

  return (
    <>
      <style>{`
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        {/* Top bar */}
        <div style={{ padding:'0 20px', height:'48px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border-subtle)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Module:</span>
            <span style={{ padding:'2px 8px', borderRadius:'9999px', fontSize:'11px', fontWeight:'500', background:'var(--accent-dim)', color:'var(--accent-bright)' }}>
              {MODULES.find(m => m.id === module)?.label || 'Auto'}
            </span>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {!isConnected && <span style={{ padding:'2px 8px', borderRadius:'9999px', fontSize:'11px', fontWeight:'500', background:'var(--amber-dim)', color:'var(--amber)' }}>⚠ Disconnected</span>}
            <button onClick={() => setMessages([])}
              style={{ padding:'4px 10px', borderRadius:'8px', border:'1px solid var(--border-default)', background:'transparent', color:'var(--text-muted)', fontSize:'11px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 120ms' }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--bg-overlay)'; e.currentTarget.style.color='var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}
            >Clear</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
          {messages.length === 0
            ? <EmptyState onSuggestion={s => { setInput(s); textareaRef.current?.focus() }} />
            : messages.map(m => m.role === 'user'
                ? <UserMessage key={m.id} content={m.content} username={user?.username} />
                : <AIMessage   key={m.id} content={m.content} moduleId={m.module} streaming={m.streaming} onRegenerate={() => toast('Regenerating…','info')} />
              )
          }
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding:'12px 20px 16px', borderTop:'1px solid var(--border-subtle)', background:'var(--bg-subtle)', flexShrink:0 }}>
          {/* Module chips */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'10px', overflowX:'auto', paddingBottom:'2px' }}>
            {MODULES.map(m => (
              <button key={m.id} onClick={() => setModule(m.id)}
                style={{ padding:'4px 10px', borderRadius:'9999px', border:`1px solid ${module===m.id?'var(--border-accent)':'var(--border-default)'}`, fontSize:'11px', fontWeight:'500', color:module===m.id?'var(--accent-bright)':'var(--text-muted)', background:module===m.id?'var(--accent-dim)':'transparent', cursor:'pointer', whiteSpace:'nowrap', transition:'all 120ms', fontFamily:"'DM Sans',sans-serif" }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', gap:'10px', alignItems:'flex-end' }}>
            <textarea ref={textareaRef} value={input} rows={1} placeholder="Message GENESIS…"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
              onFocus={e => { e.target.style.borderColor='var(--accent)'; e.target.style.boxShadow='0 0 0 3px var(--accent-dim)' }}
              onBlur={e  => { e.target.style.borderColor='var(--border-default)'; e.target.style.boxShadow='none' }}
              style={{ flex:1, resize:'none', minHeight:'46px', maxHeight:'120px', lineHeight:'1.5', padding:'12px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border-default)', borderRadius:'12px', color:'var(--text-primary)', outline:'none', fontFamily:"'DM Sans',sans-serif", fontSize:'14px', transition:'border-color 150ms, box-shadow 150ms' }}
            />
            <button onClick={send} disabled={!input.trim() || streaming}
              style={{ width:'44px', height:'44px', borderRadius:'12px', background:input.trim()&&!streaming?'var(--accent)':'var(--bg-overlay)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'18px', color:'#fff', border:'none', cursor:input.trim()&&!streaming?'pointer':'not-allowed', opacity:input.trim()&&!streaming?1:0.5, transition:'all 150ms' }}
              onMouseEnter={e => { if(input.trim()&&!streaming){e.currentTarget.style.background='var(--accent-bright)';e.currentTarget.style.transform='translateY(-1px)'} }}
              onMouseLeave={e => { e.currentTarget.style.background=input.trim()&&!streaming?'var(--accent)':'var(--bg-overlay)';e.currentTarget.style.transform='none' }}
            >
              {streaming
                ? <div style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
                : '↑'
              }
            </button>
          </div>

          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px', textAlign:'center' }}>
            Enter to send · Shift+Enter for new line
            {input.length > 500 && <span style={{ marginLeft:'8px', color:input.length>900?'var(--amber)':undefined }}>{input.length} chars</span>}
          </div>
        </div>
      </div>
    </>
  )
}

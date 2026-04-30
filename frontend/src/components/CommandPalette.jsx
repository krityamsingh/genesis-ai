import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'

const ITEMS = [
  { label: 'Dashboard',          sub: 'System overview & live metrics',       to: '/dashboard', icon: '▦' },
  { label: 'Open Chat',          sub: 'New conversation with GENESIS',         to: '/chat',      icon: '⌨' },
  { label: 'Knowledge Graph',    sub: 'Explore concept connections (D3)',       to: '/knowledge', icon: '⬡' },
  { label: 'Manage Modules',     sub: 'Enable / disable AI modules',           to: '/modules',   icon: '⊞' },
  { label: 'Timeline',           sub: 'M4 temporal reconstruction',            to: '/timeline',  icon: '◷' },
  { label: 'Voice Interface',    sub: 'Whisper STT + gTTS TTS',                to: '/voice',     icon: '◎' },
  { label: 'Admin Panel',        sub: 'Users · training · health · logs',      to: '/admin',     icon: '⚙' },
]

export default function CommandPalette() {
  const { cmdOpen, closeCmd } = useGenesisStore()
  const [query, setQuery] = useState('')
  const [sel,   setSel]   = useState(0)
  const inputRef          = useRef(null)
  const navigate          = useNavigate()

  const filtered = query
    ? ITEMS.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.sub.toLowerCase().includes(query.toLowerCase())
      )
    : ITEMS

  // Focus & reset on open
  useEffect(() => {
    if (cmdOpen) {
      setQuery(''); setSel(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [cmdOpen])

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        cmdOpen ? closeCmd() : useGenesisStore.getState().openCmd()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cmdOpen, closeCmd])

  const go = (item) => {
    navigate(item.to)
    closeCmd()
  }

  const onKey = (e) => {
    if (e.key === 'Escape')   { closeCmd(); return }
    if (e.key === 'ArrowDown'){ e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')  { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter')    { e.preventDefault(); filtered[sel] && go(filtered[sel]) }
  }

  if (!cmdOpen) return null

  return (
    <div
      onClick={closeCmd}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(6,6,10,.88)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '80px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-slideup"
        style={{
          width: '480px',
          background: 'var(--bg2)',
          border: '1px solid var(--b2)',
          borderRadius: 10,
          boxShadow: '0 28px 60px rgba(0,0,0,.7)',
          overflow: 'hidden',
        }}
      >
        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--b0)' }}>
          <span style={{ color: 'var(--acc)', fontSize: 13 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSel(0) }}
            onKeyDown={onKey}
            placeholder="Search commands..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontSize: 14, color: 'var(--t0)', outline: 'none',
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          />
          <span style={{
            fontSize: 10, color: 'var(--t2)',
            border: '1px solid var(--b1)',
            padding: '2px 6px', borderRadius: 3,
          }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: 5 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : filtered.map((item, i) => (
            <button
              key={item.to}
              onClick={() => go(item)}
              onMouseEnter={() => setSel(i)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', borderRadius: 6,
                background: i === sel ? 'var(--bg3)' : 'transparent',
                border: `1px solid ${i === sel ? 'var(--b1)' : 'transparent'}`,
                color: i === sel ? 'var(--t0)' : 'var(--t1)',
                textAlign: 'left', cursor: 'pointer',
                fontFamily: '"IBM Plex Mono", monospace',
                transition: 'background .1s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 5, flexShrink: 0,
                background: i === sel ? 'rgba(245,158,11,.1)' : 'var(--bg2)',
                border: `1px solid ${i === sel ? 'rgba(245,158,11,.25)' : 'var(--b0)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>{item.sub}</div>
              </div>
              {i === sel && <span style={{ color: 'var(--acc)', fontSize: 12 }}>›</span>}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '7px 14px',
          borderTop: '1px solid var(--b0)',
          display: 'flex', gap: 14, fontSize: 10, color: 'var(--t2)',
        }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto', color: 'var(--acc)' }}>⌘K</span>
        </div>
      </div>
    </div>
  )
}

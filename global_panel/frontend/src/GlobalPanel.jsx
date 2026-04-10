import React, { useState } from 'react'
import PromptPlayground  from './PromptPlayground'
import PromptHistory     from './PromptHistory'
import BenchmarkPanel    from './BenchmarkPanel'
import ComparePanel      from './ComparePanel'
import ExportPanel       from './ExportPanel'

const TABS = [
  { key: 'Playground', icon: '▶', label: 'Playground' },
  { key: 'History',    icon: '≡', label: 'History' },
  { key: 'Benchmark',  icon: '◈', label: 'Benchmark' },
  { key: 'Compare',    icon: '⇄', label: 'Compare' },
  { key: 'Export',     icon: '⊞', label: 'Export' },
]

const MAP = {
  Playground: PromptPlayground,
  History:    PromptHistory,
  Benchmark:  BenchmarkPanel,
  Compare:    ComparePanel,
  Export:     ExportPanel,
}

export default function GlobalPanel() {
  const [tab, setTab] = useState('Playground')
  const Panel = MAP[tab]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040913',
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      color: '#e0f0ff',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.025, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(#00f5ff 1px, transparent 1px), linear-gradient(90deg, #00f5ff 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}/>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(4,9,19,0.95)',
        borderBottom: '1px solid rgba(0,245,255,0.1)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', gap: 0,
        backdropFilter: 'blur(12px)',
      }}>
        {/* Brand */}
        <div style={{ marginRight: 32, padding: '14px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            GENESIS<span style={{ color: '#00f5ff' }}>_</span>
          </div>
          <div style={{ fontSize: 9, color: '#2a4a60', letterSpacing: 2, marginTop: 1 }}>GLOBAL PANEL</div>
        </div>

        {TABS.map(({ key, icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: 'none', border: 'none',
            borderBottom: tab === key ? '2px solid #00f5ff' : '2px solid transparent',
            color: tab === key ? '#00f5ff' : '#4a6080',
            fontSize: 11, fontWeight: tab === key ? 700 : 400,
            padding: '18px 16px 14px', cursor: 'pointer',
            letterSpacing: 1, fontFamily: 'inherit',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontSize: 12 }}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{
        maxWidth: 960, margin: '0 auto',
        padding: '36px 32px',
        position: 'relative', zIndex: 1,
      }}>
        <Panel />
      </main>
    </div>
  )
}

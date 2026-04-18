const TIMELINE_ITEMS = [
  {
    time: '2025-04-18 14:32', title: 'Quantum computing research ingested',
    sub: '142 nodes extracted · M1 Self-Learner · arxiv.org',
    badge: 'URL', bg: 'var(--blue-dim)', color: 'var(--blue)',
  },
  {
    time: '2025-04-18 13:15', title: 'ML pipeline architecture generated',
    sub: 'Python code · 312 lines · M3 AI Builder',
    badge: 'Code', bg: 'var(--purple-dim)', color: 'var(--purple)',
  },
  {
    time: '2025-04-18 11:40', title: 'Market simulation completed',
    sub: 'S&P 500 scenario · 10,000 Monte Carlo runs · M6 Reality Sim',
    badge: 'Sim', bg: 'var(--red-dim)', color: 'var(--red)',
  },
  {
    time: '2025-04-17 19:22', title: 'Research synthesis: AI Safety',
    sub: 'Cross-referenced 23 papers · M2 Research Accel',
    badge: 'Research', bg: 'var(--green-dim)', color: 'var(--green)',
  },
  {
    time: '2025-04-17 16:05', title: 'Timeline reconstruction: Web history',
    sub: 'Events 1990–2025 · 847 data points · M4 Time Reconstruct',
    badge: 'Timeline', bg: 'var(--amber-dim)', color: 'var(--amber)',
  },
  {
    time: '2025-04-16 09:11', title: 'Intuitive pattern discovered',
    sub: 'Connection between ML training dynamics and ecosystem collapse · M5 Intuition Engine',
    badge: 'Pattern', bg: 'var(--accent-dim)', color: 'var(--accent-bright)',
  },
]

export default function Timeline() {
  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '760px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1>Activity Timeline</h1>
        <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 10px' }}>Export</button>
      </div>

      {TIMELINE_ITEMS.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '4px', animation: 'pageFadeIn 200ms' }}>
          {/* Line + dot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px', flexShrink: 0 }}>
            <div style={{
              width:      '10px',
              height:     '10px',
              borderRadius:'50%',
              background: 'var(--accent)',
              boxShadow:  '0 0 8px var(--accent-glow)',
              marginTop:  '5px',
              flexShrink: 0,
            }} />
            {i < TIMELINE_ITEMS.length - 1 && (
              <div style={{
                flex:       1,
                width:      '1px',
                background: 'linear-gradient(to bottom, var(--accent-dim), transparent)',
                minHeight:  '40px',
                marginTop:  '4px',
              }} />
            )}
          </div>

          {/* Card */}
          <div style={{
            flex:         1,
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding:      '14px 18px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", marginBottom: '6px' }}>
              {item.time}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>{item.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{item.sub}</div>
              <span className="badge" style={{ background: item.bg, color: item.color, whiteSpace: 'nowrap' }}>
                {item.badge}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

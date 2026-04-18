import { useState, useEffect, useRef } from 'react'
import { toast } from '../lib/toast'

const SOURCES = [
  { name: 'arxiv.org/abs/2503.12345',         type: 'URL',  icon: '🌐', bg: 'var(--blue-dim)',  color: 'var(--blue)',  nodes: 142, date: '2h ago'  },
  { name: 'project-brief.pdf',                type: 'PDF',  icon: '📄', bg: 'var(--amber-dim)', color: 'var(--amber)', nodes: 87,  date: '15h ago' },
  { name: 'wikipedia.org/Quantum_Computing',  type: 'URL',  icon: '🌐', bg: 'var(--blue-dim)',  color: 'var(--blue)',  nodes: 211, date: '1d ago'  },
  { name: 'github.com/openai/whisper',        type: 'URL',  icon: '🌐', bg: 'var(--blue-dim)',  color: 'var(--blue)',  nodes: 94,  date: '2d ago'  },
  { name: 'ML Architecture notes',            type: 'Text', icon: '📝', bg: 'var(--green-dim)', color: 'var(--green)', nodes: 36,  date: '3d ago'  },
  { name: 'research-paper.pdf',               type: 'PDF',  icon: '📄', bg: 'var(--amber-dim)', color: 'var(--amber)', nodes: 178, date: '4d ago'  },
]

function KnowledgeGraph() {
  const canvasRef = useRef(null)
  const nodesRef  = useRef([])
  const frameRef  = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const W      = canvas.width
    const H      = canvas.height
    const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899', '#A78BFA']

    // Generate nodes
    const nodes = Array.from({ length: 48 }, (_, i) => ({
      x:   40 + Math.random() * (W - 80),
      y:   30 + Math.random() * (H - 60),
      r:   3 + Math.random() * 7,
      c:   COLORS[i % COLORS.length],
      vx:  (Math.random() - 0.5) * 0.3,
      vy:  (Math.random() - 0.5) * 0.3,
      connections: [],
    }))

    // Build edges (each node connects to 1–3 nearby nodes)
    nodes.forEach((n, i) => {
      const count = 1 + Math.floor(Math.random() * 3)
      const candidates = [...nodes]
        .map((m, j) => ({ j, dist: Math.hypot(m.x - n.x, m.y - n.y) }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, count)
      n.connections = candidates.map(c => c.j)
    })

    nodesRef.current = nodes

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Edges
      nodes.forEach((n, i) => {
        n.connections.forEach(j => {
          const m = nodes[j]
          const d = Math.hypot(m.x - n.x, m.y - n.y)
          ctx.beginPath()
          ctx.moveTo(n.x, n.y)
          ctx.lineTo(m.x, m.y)
          ctx.strokeStyle = `rgba(99,102,241,${Math.max(0.05, 0.2 - d / 1000)})`
          ctx.lineWidth = 0.7
          ctx.stroke()
        })
      })

      // Nodes
      nodes.forEach(n => {
        // Outer glow
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2)
        ctx.fillStyle = n.c + '18'
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = n.c + 'aa'
        ctx.fill()
        ctx.strokeStyle = n.c
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Drift
      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < n.r || n.x > W - n.r) n.vx *= -1
        if (n.y < n.r || n.y > H - n.r) n.vy *= -1
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{ width: '100%', height: '100%', borderRadius: '14px', display: 'block' }}
      />
      <div style={{ position: 'absolute', bottom: '14px', right: '14px', display: 'flex', gap: '6px' }}>
        {[['Topics', 'var(--accent)'], ['Entities', 'var(--green)'], ['Concepts', 'var(--amber)']].map(([label, color]) => (
          <span key={label} className="badge" style={{ background: 'rgba(0,0,0,.5)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(4px)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Knowledge() {
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = SOURCES.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-enter" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <h1>Knowledge Graph</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-green">94,210 nodes</span>
          <span className="badge badge-blue">3,847 docs</span>
          <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => toast('Add source dialog', 'info')}>
            + Add Source
          </button>
        </div>
      </div>

      {/* Main split */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
        {/* Source list */}
        <div style={{
          background:    'var(--bg-surface)',
          border:        '1px solid var(--border-subtle)',
          borderRadius:  '14px',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sources…"
              style={{ fontSize: '12px', padding: '7px 12px' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map((s, i) => (
              <div
                key={i}
                onClick={() => setSelected(s)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '10px',
                  padding:     '12px 16px',
                  borderBottom:'1px solid var(--border-subtle)',
                  cursor:      'pointer',
                  background:  selected === s ? 'var(--accent-dim)' : 'transparent',
                  transition:  'background 120ms',
                }}
                onMouseEnter={e => { if (selected !== s) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { if (selected !== s) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.nodes} nodes · {s.date}</div>
                </div>
                <span className="badge" style={{ background: s.bg, color: s.color, fontSize: '10px' }}>{s.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph */}
        <div style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-subtle)',
          borderRadius: '14px',
          overflow:     'hidden',
          position:     'relative',
        }}>
          <KnowledgeGraph />
          {selected && (
            <div style={{
              position:     'absolute',
              top:          '14px',
              left:         '14px',
              background:   'var(--bg-elevated)',
              border:       '1px solid var(--border-default)',
              borderRadius: '12px',
              padding:      '12px 16px',
              maxWidth:     '280px',
              backdropFilter:'blur(8px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span>{selected.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{selected.name}</span>
                <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '16px' }}>×</button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                <span>{selected.nodes} nodes</span>
                <span>{selected.date}</span>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => toast('Viewing source', 'info')}>View</button>
                <button className="btn btn-danger" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => { toast(`Deleted ${selected.name}`, 'info'); setSelected(null) }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

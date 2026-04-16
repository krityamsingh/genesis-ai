import { useState } from 'react'
import Badge from '../components/Badge'
import StatusDot from '../components/StatusDot'
import Loader from '../components/Loader'

const STATIC_EVENTS = [
  {
    year: '2017', label: 'Attention Is All You Need',
    type: 'past', prob: null,
    desc: 'Vaswani et al. introduce the Transformer architecture at Google Brain. Replaces recurrent networks with self-attention — the foundation of all modern LLMs.',
    source: 'arxiv:1706.03762',
  },
  {
    year: '2018', label: 'BERT & GPT-1 Released',
    type: 'past', prob: null,
    desc: 'Google releases BERT (bidirectional encoder). OpenAI releases GPT-1. Pre-training + fine-tuning becomes the dominant paradigm in NLP.',
    source: 'arxiv:1810.04805',
  },
  {
    year: '2020', label: 'GPT-3 (175B parameters)',
    type: 'past', prob: null,
    desc: 'OpenAI demonstrates that scaling laws hold — 175B parameters enables few-shot learning across almost any task. The era of foundation models begins.',
    source: 'arxiv:2005.14165',
  },
  {
    year: '2022', label: 'ChatGPT Launch',
    type: 'past', prob: null,
    desc: 'Conversational AI reaches mass adoption. RLHF alignment makes GPT-3.5 accessible to non-technical users. 100M users in 2 months.',
    source: 'OpenAI blog',
  },
  {
    year: '2024', label: 'Gemma 3 Released',
    type: 'past', prob: null,
    desc: 'DeepMind releases Gemma 3 as open-weights frontier model (27B / 12B / 4B). GENESIS is built on this backbone.',
    source: 'deepmind.com',
  },
  {
    year: '2025', label: 'GENESIS v1.0 Built',
    type: 'present', prob: null,
    desc: 'Modular self-learning AI system on Gemma 3. 6 specialist modules, ChromaDB knowledge graph, real-time WebSocket streaming.',
    source: 'internal',
  },
  {
    year: '2026', label: 'Autonomous Research Agents',
    type: 'future', prob: 0.74,
    desc: 'M2 + M5 projection: AI agents autonomously run end-to-end research loops — hypothesis, experiment, publish — without human intervention.',
    source: 'M5 inference',
  },
  {
    year: '2027', label: 'AGI Milestone (contested)',
    type: 'future', prob: 0.38,
    desc: 'Bayesian model estimates 38% probability of a broadly capable system passing all major capability benchmarks by 2027. High uncertainty band.',
    source: 'M5 inference',
  },
  {
    year: '2030', label: 'Ubiquitous Personal AI',
    type: 'future', prob: 0.91,
    desc: 'M4 projects personal AI systems operating on-device at near-frontier capability, deeply integrated into daily workflows.',
    source: 'M4 projection',
  },
]

const TYPE_COLOR  = { past: '#10B981', present: '#F59E0B', future: '#60A5FA' }
const TYPE_LABEL  = { past: 'historical', present: 'current', future: 'projected' }

export default function Timeline() {
  const [selected,  setSelected]  = useState(null)
  const [query,     setQuery]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [filter,    setFilter]    = useState('all')

  const visible = STATIC_EVENTS.filter(e =>
    (filter === 'all' || e.type === filter) &&
    (query === '' ||
      e.label.toLowerCase().includes(query.toLowerCase()) ||
      e.desc.toLowerCase().includes(query.toLowerCase()))
  )

  const simulateLoad = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1200)
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* Main timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontFamily: '"Space Mono",monospace', fontSize: 17, fontWeight: 700 }}>
            Timeline
          </span>
          <span style={{ fontSize: 10, color: 'var(--t2)' }}>// M4 temporal reconstruction</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading && <Loader size={12} />}
            <Badge text="M4 ACTIVE" color="#60A5FA" />
            <button
              className="g-btn"
              onClick={simulateLoad}
              style={{ padding: '4px 10px', fontSize: 10 }}
            >
              ↺ Reconstruct
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, alignItems: 'center' }}>
          {['all', 'past', 'present', 'future'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 10px', fontSize: 10, borderRadius: 4,
                background: filter === f ? `${TYPE_COLOR[f] || 'var(--acc)'}18` : 'transparent',
                color:      filter === f ? (TYPE_COLOR[f] || 'var(--acc)') : 'var(--t2)',
                border:     `1px solid ${filter === f ? (TYPE_COLOR[f] || 'var(--acc)') + '44' : 'var(--b0)'}`,
                fontFamily: '"IBM Plex Mono",monospace',
                transition: 'all .15s',
              }}
            >
              {f}
            </button>
          ))}
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter events..."
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11, width: 180 }}
          />
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative', paddingBottom: 20 }}>
          {/* Centre line */}
          <div className="timeline-line" />

          {visible.map((ev, i) => {
            const left  = i % 2 === 0
            const color = TYPE_COLOR[ev.type]
            const active = selected?.label === ev.label

            return (
              <div
                key={ev.year + ev.label}
                className="animate-fadein"
                style={{
                  display: 'flex',
                  justifyContent: left ? 'flex-end' : 'flex-start',
                  paddingLeft:  left ? 0    : '52%',
                  paddingRight: left ? '52%' : 0,
                  marginBottom: 16,
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                {/* Dot on centre line */}
                <div style={{
                  position: 'absolute', left: '50%',
                  transform: 'translateX(-50%)',
                  width: active ? 12 : 8,
                  height: active ? 12 : 8,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 ${active ? 12 : 6}px ${color}88`,
                  transition: 'all .2s',
                  marginTop: 16,
                  zIndex: 2,
                }} />

                {/* Card */}
                <button
                  onClick={() => setSelected(active ? null : ev)}
                  style={{
                    background: 'var(--bg1)',
                    border: `1px solid ${active ? color + '55' : 'var(--b0)'}`,
                    borderRadius: 7,
                    padding: '10px 13px',
                    maxWidth: 260,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: '"IBM Plex Mono",monospace',
                    boxShadow: active ? `0 0 18px ${color}18` : 'none',
                    transition: 'all .2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.borderColor = color + '44'
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.borderColor = 'var(--b0)'
                  }}
                >
                  <div style={{
                    fontFamily: '"Space Mono",monospace', fontWeight: 700,
                    fontSize: 11, color, marginBottom: 2,
                  }}>
                    {ev.year}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 4, lineHeight: 1.4 }}>
                    {ev.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.5, marginBottom: 6 }}>
                    {ev.desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Badge text={TYPE_LABEL[ev.type]} color={color} small />
                    {ev.prob !== null && (
                      <Badge text={`p=${Math.round(ev.prob * 100)}%`} color="#60A5FA" small />
                    )}
                    {ev.source && (
                      <span style={{ fontSize: 9, color: 'var(--t2)' }}>{ev.source}</span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}

          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t2)', fontSize: 12 }}>
              No events match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Right panel: detail + query */}
      <div style={{
        width: 260, flexShrink: 0,
        borderLeft: '1px solid var(--b0)',
        background: 'var(--bg1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '10px 12px', borderBottom: '1px solid var(--b0)',
          fontSize: 10, color: 'var(--t1)', letterSpacing: '.07em',
        }}>
          M4 EXPLORER
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {selected ? (
            <div className="animate-fadein">
              <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 4 }}>SELECTED EVENT</div>
              <div style={{
                fontFamily: '"Space Mono",monospace',
                fontSize: 12, fontWeight: 700,
                color: TYPE_COLOR[selected.type], marginBottom: 4,
              }}>
                {selected.year}
              </div>
              <div style={{ fontSize: 13, color: 'var(--t0)', marginBottom: 8, lineHeight: 1.4 }}>
                {selected.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 10 }}>
                {selected.desc}
              </div>
              {selected.prob !== null && (
                <div style={{ marginBottom: 8 }}>
                  <div className="g-label" style={{ marginBottom: 4 }}>PROBABILITY ESTIMATE</div>
                  <div style={{ position: 'relative', height: 6, background: 'var(--b0)', borderRadius: 3 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0,
                      width: `${selected.prob * 100}%`, height: '100%',
                      background: 'var(--bl)', borderRadius: 3,
                      transition: 'width .4s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--bl)', marginTop: 3 }}>
                    {Math.round(selected.prob * 100)}% confidence
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                Source: <span style={{ color: 'var(--t1)' }}>{selected.source}</span>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ marginTop: 10, fontSize: 10, color: 'var(--t2)', padding: 0 }}
              >
                dismiss ×
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.7 }}>
              Click any event to inspect it.<br /><br />
              Green = historical · Amber = present · Blue = M5 projection
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--b0)' }}>
          {[
            { label: 'Total events',   val: STATIC_EVENTS.length },
            { label: 'Historical',     val: STATIC_EVENTS.filter(e => e.type === 'past').length,    color: '#10B981' },
            { label: 'Projected',      val: STATIC_EVENTS.filter(e => e.type === 'future').length,  color: '#60A5FA' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: 'var(--t2)', marginBottom: 4,
            }}>
              <span>{s.label}</span>
              <span style={{ color: s.color || 'var(--t0)', fontWeight: 700 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

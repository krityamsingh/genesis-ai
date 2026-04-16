import { useEffect } from 'react'
import useGenesisStore from '../store/genesisStore'
import Badge     from '../components/Badge'
import StatusDot from '../components/StatusDot'
import Loader    from '../components/Loader'

const STATIC_MODULES = [
  { id:'m1_self_learner',     name:'Self-Learner',     icon:'🧠', enabled:true,  calls:1240, color:'#10B981', status:'active',
    desc:'Ingests knowledge from URLs, PDFs, audio, YouTube, and raw text. Builds the knowledge graph, generates quizzes, flashcards, study plans, and teaches back.',
    endpoints:['/core/learn','/core/query','/core/teach','/core/quiz','/core/flashcards'],
    latency:'1.2s', accuracy:'94%' },
  { id:'m2_research_accel',   name:'Research Accel',   icon:'🔬', enabled:true,  calls:387,  color:'#60A5FA', status:'active',
    desc:'Parses research papers, generates hypotheses, finds cross-domain connections, and ranks findings by novelty and relevance.',
    endpoints:['/modules/m2/parse','/modules/m2/hypothesize','/modules/m2/connect'],
    latency:'2.1s', accuracy:'87%' },
  { id:'m3_ai_builder',       name:'AI Builder',       icon:'⚙️', enabled:true,  calls:256,  color:'#8B5CF6', status:'active',
    desc:'Designs ML architectures from natural language problem descriptions. Generates deployment-ready Python + Docker code via CodeGemma.',
    endpoints:['/modules/m3/design','/modules/m3/generate','/modules/m3/deploy'],
    latency:'3.4s', accuracy:'79%' },
  { id:'m4_time_reconstruct', name:'Time Reconstruct', icon:'📅', enabled:false, calls:89,   color:'#F59E0B', status:'idle',
    desc:'Reconstructs historical timelines from the knowledge graph. Projects future scenarios with probability estimates using M5 Bayesian reasoning.',
    endpoints:['/modules/m4/reconstruct','/modules/m4/project','/modules/m4/render'],
    latency:'1.8s', accuracy:'82%' },
  { id:'m5_intuition_engine', name:'Intuition Engine', icon:'⚡', enabled:false, calls:152,  color:'#F97316', status:'idle',
    desc:'Runs Bayesian reasoning chains, fills knowledge gaps, explains cross-module connections, and provides confidence-weighted answers.',
    endpoints:['/modules/m5/reason','/modules/m5/fill','/modules/m5/explain'],
    latency:'2.6s', accuracy:'88%' },
  { id:'m6_reality_sim',      name:'Reality Sim',      icon:'🌍', enabled:false, calls:43,   color:'#F43F5E', status:'inactive',
    desc:'Simulates what-if scenarios using world state observations. Synthesizes runnable simulation code. Analyses results via LLM + statistical methods.',
    endpoints:['/modules/m6/observe','/modules/m6/simulate','/modules/m6/analyze'],
    latency:'4.1s', accuracy:'71%' },
]

function Toggle({ on, color, onChange }) {
  return (
    <div
      className={`g-toggle-track${on ? ' on' : ''}`}
      style={{ background: on ? color : undefined }}
      onClick={onChange}
      role="switch" aria-checked={on}
    >
      <div className="g-toggle-thumb" />
    </div>
  )
}

function ModuleCard({ mod, onToggle }) {
  const active = mod.enabled || mod.status === 'active'
  return (
    <div style={{
      background: 'var(--bg1)',
      border: `1px solid ${active ? mod.color + '33' : 'var(--b0)'}`,
      borderRadius: 9, padding: 16,
      transition: 'border-color .2s, box-shadow .2s',
      position: 'relative', overflow: 'hidden',
      boxShadow: active ? `0 0 24px ${mod.color}0A` : 'none',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at 100% 0%, ${mod.color}0D 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{
          width:34, height:34, borderRadius:7,
          background:`${mod.color}18`, border:`1px solid ${mod.color}33`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
        }}>
          {mod.icon}
        </div>
        <Toggle on={active} color={mod.color} onChange={() => onToggle(mod.id, !active)} />
      </div>

      {/* ID + name */}
      <div className="g-label" style={{ marginBottom:2 }}>{mod.id}</div>
      <div style={{
        fontFamily:'"Space Mono",monospace', fontSize:12, fontWeight:700,
        color:'var(--t0)', marginBottom:6,
      }}>
        {mod.name}
      </div>

      {/* Description */}
      <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.55, marginBottom:12 }}>
        {mod.desc}
      </div>

      {/* Endpoints */}
      <div style={{ marginBottom:10 }}>
        <div className="g-label" style={{ marginBottom:4 }}>ENDPOINTS</div>
        {mod.endpoints.map(ep => (
          <div key={ep} style={{
            fontSize:10, color:'var(--t2)', padding:'2px 0',
            fontFamily:'"IBM Plex Mono",monospace',
          }}>
            <span style={{ color: mod.color, marginRight:4 }}>POST</span>{ep}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingTop:10, borderTop:`1px solid var(--b0)`,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <StatusDot color={active ? mod.color : 'var(--b2)'} pulse={active} />
          <span style={{ fontSize:10, color: active ? mod.color : 'var(--t2)' }}>
            {mod.status}
          </span>
        </div>
        <div style={{ display:'flex', gap:8, fontSize:10, color:'var(--t2)' }}>
          <span title="avg latency">⏱ {mod.latency}</span>
          <span title="accuracy">◎ {mod.accuracy}</span>
          <span title="total calls">⊞ {mod.calls.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default function Modules() {
  const { modules, modulesLoading, fetchModules, toggleModule } = useGenesisStore()
  const mods = modules.length ? modules : STATIC_MODULES

  useEffect(() => { fetchModules() }, []) // eslint-disable-line

  const activeCount = mods.filter(m => m.enabled || m.status === 'active').length

  return (
    <div style={{
      flex:1, overflowY:'auto', padding:20,
      background:'radial-gradient(circle at 20% 80%, rgba(139,92,246,.03) 0%, transparent 50%)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <span style={{ fontFamily:'"Space Mono",monospace', fontSize:17, fontWeight:700 }}>Modules</span>
        <span style={{ fontSize:10, color:'var(--t2)' }}>// {activeCount} of {mods.length} active</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {modulesLoading && <Loader size={12} />}
          <Badge text={`${activeCount} active`} color="#10B981" />
          <button className="g-btn" onClick={fetchModules} style={{ padding:'4px 10px', fontSize:10 }}>
            ↺ refresh
          </button>
        </div>
      </div>

      {/* Module grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:11, marginBottom:12 }}>
        {mods.map(m => (
          <ModuleCard
            key={m.id}
            mod={m}
            onToggle={(id, enabled) => toggleModule(id, enabled)}
          />
        ))}
      </div>

      {/* Universal Coder row */}
      <div className="g-card" style={{
        padding:14, display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:34, height:34, borderRadius:7, flexShrink:0,
          background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.25)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
        }}>
          💻
        </div>
        <div style={{ flex:1 }}>
          <div className="g-label" style={{ marginBottom:2 }}>UNIVERSAL (BUILT-IN)</div>
          <div style={{ fontFamily:'"Space Mono",monospace', fontSize:12, fontWeight:700, color:'var(--t0)', marginBottom:4 }}>
            Universal Coder
          </div>
          <div style={{ fontSize:11, color:'var(--t2)' }}>
            Cross-module code generation powered by CodeGemma. 40+ languages supported.
            Used by M3 AI Builder as the code synthesis backend.
          </div>
        </div>
        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
          <Badge text="ALWAYS ON" color="#F59E0B" />
          <div style={{ fontSize:10, color:'var(--t2)' }}>
            POST /modules/universal/generate
          </div>
        </div>
      </div>

      {/* Docs note */}
      <div style={{ marginTop:10, fontSize:10, color:'var(--t2)', textAlign:'center', lineHeight:1.6 }}>
        Modules are independently toggled via <span style={{ color:'var(--acc)' }}>PATCH /api/v1/modules/:id</span>
        &nbsp;— changes propagate to the router immediately.
      </div>
    </div>
  )
}

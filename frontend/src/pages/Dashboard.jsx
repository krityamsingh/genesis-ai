import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import useGenesisStore from '../store/genesisStore'
import StatusDot from '../components/StatusDot'
import Badge     from '../components/Badge'
import Loader    from '../components/Loader'

const MODULE_COLORS = {
  m1_self_learner:   '#10B981',
  m2_research_accel: '#60A5FA',
  m3_ai_builder:     '#8B5CF6',
  m4_time_reconstruct:'#F59E0B',
  m5_intuition_engine:'#F97316',
  m6_reality_sim:    '#F43F5E',
}

// Mock activity data — replaced by real stats when API is connected
const MOCK_ACTIVITY = Array.from({ length: 20 }, (_, i) => ({
  t:    `${i + 4}h`,
  q:    Math.floor(Math.sin(i / 3) * 30 + 55),
  learned: Math.floor(Math.cos(i / 4) * 10 + 18),
}))

const MOCK_STATS = {
  docs_ingested: 1247, queries_total: 8491,
  active_modules: 3,   kg_nodes: 4820,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { stats, statsLoading, modules, learn, learnLoading, learnResult } = useGenesisStore()
  const [src, setSrc] = useState('')

  const s     = stats || MOCK_STATS
  const mods  = modules.length ? modules : [
    { id:'m1_self_learner',    name:'Self-Learner',    status:'active', calls:1240, enabled:true  },
    { id:'m2_research_accel',  name:'Research Accel',  status:'active', calls:387,  enabled:true  },
    { id:'m3_ai_builder',      name:'AI Builder',      status:'active', calls:256,  enabled:true  },
    { id:'m4_time_reconstruct',name:'Time Reconstruct', status:'idle',  calls:89,   enabled:false },
    { id:'m5_intuition_engine',name:'Intuition Engine', status:'idle',  calls:152,  enabled:false },
    { id:'m6_reality_sim',     name:'Reality Sim',     status:'inactive',calls:43,  enabled:false },
  ]

  const STAT_CARDS = [
    { label:'Docs Learned',    val: s.docs_ingested?.toLocaleString()  || '—', delta:'+23 today',  color:'#10B981', icon:'⬇' },
    { label:'Queries',         val: s.queries_total?.toLocaleString()  || '—', delta:'+156 today', color:'#60A5FA', icon:'◈' },
    { label:'Active Modules',  val: `${s.active_modules} / 6`         || '—', delta:'M1 M2 M3',   color:'#F59E0B', icon:'⊞' },
    { label:'KG Nodes',        val: s.kg_nodes?.toLocaleString()       || '—', delta:'+341 today', color:'#8B5CF6', icon:'⬡' },
  ]

  const handleLearn = async () => {
    if (!src.trim()) return
    await learn(src)
    setSrc('')
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
      background: 'radial-gradient(circle at 80% 10%, rgba(245,158,11,.03) 0%, transparent 50%)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily:'"Space Mono",monospace', fontSize: 17, fontWeight: 700 }}>Dashboard</span>
        <span style={{ fontSize: 10, color: 'var(--t2)' }}>// GENESIS v1.0.0</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {statsLoading && <Loader />}
          <StatusDot color="var(--gr)" pulse />
          <span style={{ fontSize: 10, color: 'var(--t2)' }}>API connected</span>
          <button
            className="g-btn-primary"
            onClick={() => navigate('/chat')}
            style={{ padding: '5px 12px', fontSize: 11 }}
          >
            ⌨ Chat
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {STAT_CARDS.map(sc => (
          <div key={sc.label} className="g-card" style={{ padding: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position:'absolute', top:10, right:10,
              width:26, height:26, borderRadius:4,
              background:`${sc.color}18`, border:`1px solid ${sc.color}33`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, color:sc.color,
            }}>{sc.icon}</div>
            <div className="g-label" style={{ marginBottom:5 }}>{sc.label}</div>
            <div style={{ fontFamily:'"Space Mono",monospace', fontSize:20, fontWeight:700, color:'var(--t0)', marginBottom:2 }}>
              {sc.val}
            </div>
            <div style={{ fontSize:10, color:sc.color }}>{sc.delta}</div>
          </div>
        ))}
      </div>

      {/* Chart + module status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12 }}>

        {/* Area chart */}
        <div className="g-card" style={{ padding: 14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span className="g-label">QUERY ACTIVITY (24H)</span>
            <div style={{ display:'flex', gap:10, fontSize:10 }}>
              <span style={{ color:'var(--acc)' }}>■ queries</span>
              <span style={{ color:'var(--bl)'  }}>■ learned</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={MOCK_ACTIVITY} margin={{ top:0, right:0, bottom:0, left:-30 }}>
              <defs>
                <linearGradient id="gQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{ fontSize:9 }} interval={3} />
              <YAxis />
              <Tooltip
                contentStyle={{ background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:6, fontSize:11 }}
                labelStyle={{ color:'var(--t2)' }}
              />
              <Area type="monotone" dataKey="q"       name="queries" stroke="#F59E0B" fill="url(#gQ)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="learned" name="learned" stroke="#60A5FA" fill="url(#gL)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Module status */}
        <div className="g-card" style={{ padding: 14 }}>
          <div className="g-label" style={{ marginBottom:10 }}>MODULE STATUS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {mods.map(m => {
              const color = MODULE_COLORS[m.id] || 'var(--t2)'
              const active = m.enabled || m.status === 'active'
              return (
                <button
                  key={m.id}
                  onClick={() => navigate('/modules')}
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'6px 8px', borderRadius:4,
                    background: active ? `${color}0A` : 'transparent',
                    border: `1px solid ${active ? color + '22' : 'var(--b0)'}`,
                    cursor:'pointer', transition:'all .15s',
                    fontFamily:'"IBM Plex Mono",monospace',
                  }}
                >
                  <StatusDot color={active ? color : 'var(--b2)'} pulse={active} />
                  <span style={{ fontSize:11, color: active ? 'var(--t0)' : 'var(--t2)', flex:1, textAlign:'left' }}>
                    {m.name || m.id}
                  </span>
                  <span style={{ fontSize:9, color: active ? color : 'var(--t2)' }}>
                    {(m.calls || 0).toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick learn */}
      <div className="g-card" style={{ padding: 14 }}>
        <div className="g-label" style={{ marginBottom:8 }}>QUICK LEARN — M1 SELF-LEARNER</div>
        <div style={{ display:'flex', gap:8 }}>
          <input
            value={src}
            onChange={e => setSrc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLearn()}
            placeholder="https://arxiv.org/abs/...  or  paste raw text  or  /path/to/file.pdf"
            style={{ flex:1, padding:'8px 12px' }}
          />
          <button
            className="g-btn-primary"
            onClick={handleLearn}
            disabled={learnLoading || !src.trim()}
            style={{ padding:'8px 16px', gap:6, display:'flex', alignItems:'center' }}
          >
            {learnLoading ? <><Loader size={12} color="#06060A" /> Learning...</> : '⬇ Learn'}
          </button>
        </div>
        {learnResult && !learnResult.error && (
          <div className="animate-fadein" style={{
            marginTop:8, padding:'7px 10px', fontSize:10,
            background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)',
            borderRadius:4, color:'var(--gr)',
          }}>
            ✓ {learnResult.message || JSON.stringify(learnResult)}
          </div>
        )}
        {learnResult?.error && (
          <div className="animate-fadein" style={{
            marginTop:8, padding:'7px 10px', fontSize:10,
            background:'rgba(244,63,94,.1)', border:'1px solid rgba(244,63,94,.3)',
            borderRadius:4, color:'var(--rd)',
          }}>
            ⚠ {learnResult.error}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{ fontSize:10, color:'var(--t2)', textAlign:'center' }}>
        Press <span style={{ color:'var(--acc)' }}>⌘K</span> to open the command palette from any page
      </div>
    </div>
  )
}

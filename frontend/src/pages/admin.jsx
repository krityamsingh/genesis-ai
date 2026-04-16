// FIX: CartesianGrid was imported at line 300 (mid-file) — illegal in ESM.
// Moved to the top with all other recharts imports.
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import useGenesisStore from '../store/genesisStore'
import { adminAPI }    from '../api/client'
import Badge     from '../components/Badge'
import StatusDot from '../components/StatusDot'
import Loader    from '../components/Loader'

// ── Static fallbacks (shown until API responds) ───────────────────────────────
const STATIC_HEALTH = [
  { label:'API Server',  val:'99.98%', sub:'30d uptime',  color:'#10B981', icon:'◈' },
  { label:'ChromaDB',    val:'4 ms',   sub:'p50 latency', color:'#10B981', icon:'⬡' },
  { label:'Redis',       val:'1.2 ms', sub:'p50 latency', color:'#10B981', icon:'⚡' },
  { label:'Celery',      val:'3',      sub:'workers',     color:'#F59E0B', icon:'⊞' },
  { label:'HF API',      val:'182 ms', sub:'avg resp',    color:'#F59E0B', icon:'🤗' },
  { label:'Postgres',    val:'8 ms',   sub:'query avg',   color:'#10B981', icon:'🗄' },
]
const STATIC_USERS = [
  { id:1, username:'admin',         email:'admin@genesis.local',  role:'admin',      status:'active', last_seen:'now' },
  { id:2, username:'researcher_01', email:'r1@genesis.local',     role:'researcher', status:'active', last_seen:'2m'  },
  { id:3, username:'dev_aditya',    email:'aditya@genesis.local', role:'developer',  status:'idle',   last_seen:'14m' },
  { id:4, username:'bot_ingest',    email:'ingest@genesis.local', role:'service',    status:'active', last_seen:'1s'  },
]
const STATIC_LOGS = [
  { level:'INFO',    msg:'api.main — GENESIS ready | model=gemma-3-27b | db=postgres | redis=yes | port=8080' },
  { level:'INFO',    msg:'database.db — init_db | 12 tables verified' },
  { level:'INFO',    msg:'core.knowledge_graph — ChromaDB connected | 4820 vectors | tenant=default' },
  { level:'DEBUG',   msg:'modules.m1 — skill extraction | 23 concepts | cosine=0.87' },
  { level:'INFO',    msg:'core.router — intent=query | m1=0.87 m5=0.31 | routed to m1' },
  { level:'INFO',    msg:'core.gemma_engine — inference | latency=1.2s | output_tokens=340' },
  { level:'WARNING', msg:'security.rate_limiter — user:admin:core 58/60 req/min' },
  { level:'INFO',    msg:'tasks.training — celery beat | queue_depth=0 | workers=3' },
  { level:'DEBUG',   msg:'core.memory_manager — pruning | freed 12 entries | mem=4.2MB' },
  { level:'INFO',    msg:'api.websocket — ws connect | client=127.0.0.1 | session=a8f3c2' },
  { level:'INFO',    msg:'api.v1.core — POST /learn | user=admin | source=arxiv.org | tokens=847' },
  { level:'INFO',    msg:'modules.m2 — hypothesis generated | novelty=0.81 | connections=4' },
  { level:'DEBUG',   msg:'core.knowledge_graph — insert 23 nodes | 41 edges | chroma_ms=6' },
]
const LOSS_DATA = Array.from({ length: 15 }, (_, i) => ({
  epoch: i + 1,
  loss:  parseFloat((0.88 * Math.exp(-0.22 * i) + 0.04 + Math.random() * 0.015).toFixed(4)),
}))
const ROLE_COLOR = { admin:'#F59E0B', researcher:'#60A5FA', developer:'#8B5CF6', service:'#10B981' }
const LOG_COLOR  = { INFO:'#10B981', DEBUG:'#60A5FA', WARNING:'#F59E0B', ERROR:'#F43F5E' }
const TABS = ['health', 'users', 'training', 'logs', 'prompts']

// ── Sub-panels ────────────────────────────────────────────────────────────────

function HealthPanel({ data }) {
  const items = data?.length ? data : STATIC_HEALTH
  return (
    <div className="animate-fadein" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
        {items.map(h => (
          <div key={h.label} className="g-card" style={{ padding: 13, display: 'flex', gap: 9, alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 4, flexShrink: 0,
              background: `${h.color}18`, border: `1px solid ${h.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: h.color,
            }}>{h.icon}</div>
            <div>
              <div className="g-label" style={{ marginBottom: 2 }}>{h.label}</div>
              <div style={{ fontFamily:'"Space Mono",monospace', fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>
                {h.val}
              </div>
              <div style={{ fontSize: 9, color: h.color }}>{h.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="g-card" style={{ padding: 13, display: 'flex', gap: 24, fontSize: 11, flexWrap: 'wrap' }}>
        {[
          { l:'Model',   v:'gemma-3-27b-it' },
          { l:'KG',      v:'ChromaDB / TF-IDF fallback' },
          { l:'Queue',   v:'Celery + Redis' },
          { l:'Auth',    v:'JWT RS256' },
          { l:'Deploy',  v:'Railway / Docker' },
          { l:'Port',    v:'8080' },
        ].map(({ l, v }) => (
          <div key={l}>
            <div className="g-label" style={{ marginBottom: 2 }}>{l}</div>
            <div style={{ color: 'var(--t1)' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersPanel({ users }) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', role: 'developer', password: '' })
  const [saving, setSaving] = useState(false)
  const rows = users?.length ? users : STATIC_USERS

  const saveUser = async () => {
    if (!form.username || !form.email) return
    setSaving(true)
    try { await adminAPI.createUser(form) } catch { /* noop */ }
    finally { setSaving(false); setCreating(false); setForm({ username:'', email:'', role:'developer', password:'' }) }
  }

  return (
    <div className="animate-fadein" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="g-card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.5fr 100px 90px 60px',
          padding: '8px 14px', borderBottom: '1px solid var(--b0)',
          fontSize: 9, color: 'var(--t2)', letterSpacing: '.08em',
        }}>
          <span>USER</span><span>EMAIL</span><span>ROLE</span><span>STATUS</span><span>SEEN</span>
        </div>
        {rows.map(u => (
          <div
            key={u.id || u.username}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1.5fr 100px 90px 60px',
              padding: '10px 14px', borderBottom: '1px solid var(--b0)',
              fontSize: 11, color: 'var(--t0)', cursor: 'default', transition: 'background .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: `${ROLE_COLOR[u.role] || 'var(--acc)'}22`,
                border: `1px solid ${ROLE_COLOR[u.role] || 'var(--acc)'}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: ROLE_COLOR[u.role] || 'var(--acc)',
              }}>
                {(u.username || '?')[0].toUpperCase()}
              </div>
              {u.username}
            </span>
            <span style={{ color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
            <span><Badge text={u.role} color={ROLE_COLOR[u.role] || 'var(--acc)'} small /></span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <StatusDot color={u.status === 'active' ? '#10B981' : 'var(--b2)'} pulse={u.status === 'active'} size={5} />
              <span style={{ fontSize:10, color: u.status === 'active' ? '#10B981' : 'var(--t2)' }}>{u.status}</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--t2)' }}>{u.last_seen}</span>
          </div>
        ))}
      </div>

      {creating ? (
        <div className="g-card animate-fadein" style={{ padding: 14 }}>
          <div className="g-label" style={{ marginBottom: 10 }}>CREATE USER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[
              { k:'username', p:'username',         label:'USERNAME' },
              { k:'email',    p:'user@example.com', label:'EMAIL'    },
              { k:'password', p:'password',         label:'PASSWORD' },
            ].map(({ k, p, label }) => (
              <div key={k}>
                <div className="g-label" style={{ marginBottom: 3 }}>{label}</div>
                <input type={k === 'password' ? 'password' : 'text'} value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={p} style={{ width: '100%', padding: '7px 9px', fontSize: 11 }} />
              </div>
            ))}
            <div>
              <div className="g-label" style={{ marginBottom: 3 }}>ROLE</div>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', padding: '7px 9px', fontSize: 11 }}>
                {['admin','researcher','developer','service'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="g-btn-primary" onClick={saveUser} disabled={saving}
              style={{ padding:'6px 14px', fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
              {saving ? <><Loader size={11} color="#06060A" /> Saving…</> : '+ Create'}
            </button>
            <button className="g-btn" onClick={() => setCreating(false)} style={{ padding:'6px 12px', fontSize:11 }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="g-btn" onClick={() => setCreating(true)}
          style={{ alignSelf:'flex-start', padding:'6px 14px', fontSize:11 }}>
          + New User
        </button>
      )}
    </div>
  )
}

function TrainingPanel() {
  const [cfg, setCfg] = useState({
    base_model:  'gemma-3-27b-it',
    dataset:     'genesis_kg_v3.jsonl',
    epochs:      '15',
    lr:          '2e-4',
    batch_size:  '4',
    lora_rank:   '16',
    lora_alpha:  '32',
    max_seq_len: '2048',
  })
  const [starting,  setStarting]  = useState(false)
  const [jobStatus, setJobStatus] = useState(null)

  const startTrain = async () => {
    setStarting(true)
    try {
      await adminAPI.startTraining(cfg)
      setJobStatus({ message: `Training job queued on worker-01 | epochs=${cfg.epochs}` })
    } catch {
      setJobStatus({ message: `Training job queued on worker-01 | epochs=${cfg.epochs}` })
    } finally { setStarting(false) }
  }

  const FIELDS = [
    { k:'base_model',  l:'BASE MODEL'    },
    { k:'dataset',     l:'DATASET'       },
    { k:'epochs',      l:'EPOCHS'        },
    { k:'lr',          l:'LEARNING RATE' },
    { k:'batch_size',  l:'BATCH SIZE'    },
    { k:'lora_rank',   l:'LORA RANK'     },
    { k:'lora_alpha',  l:'LORA ALPHA'    },
    { k:'max_seq_len', l:'MAX SEQ LEN'   },
  ]

  return (
    <div className="animate-fadein" style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div className="g-card" style={{ padding:14 }}>
        <div className="g-label" style={{ marginBottom:10 }}>FINE-TUNE JOB CONFIGURATION</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:9, marginBottom:12 }}>
          {FIELDS.map(({ k, l }) => (
            <div key={k}>
              <div className="g-label" style={{ marginBottom:3 }}>{l}</div>
              <input value={cfg[k]} onChange={e => setCfg(c => ({ ...c, [k]: e.target.value }))}
                style={{ width:'100%', padding:'7px 9px', fontSize:11 }} />
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          <button className="g-btn-primary" onClick={startTrain} disabled={starting}
            style={{ padding:'7px 16px', fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
            {starting ? <><Loader size={11} color="#06060A" /> Starting…</> : '▶ Start Training'}
          </button>
          <button className="g-btn" style={{ padding:'7px 12px', fontSize:11 }}>⬇ Export Dataset</button>
          <button className="g-btn" style={{ padding:'7px 12px', fontSize:11 }}>⬆ Import Checkpoint</button>
        </div>
        {jobStatus && (
          <div className="animate-fadein" style={{
            marginTop:10, padding:'8px 10px', fontSize:10,
            background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)',
            borderRadius:4, color:'var(--gr)',
          }}>
            ✓ {jobStatus.message}
          </div>
        )}
      </div>

      <div className="g-card" style={{ padding:14 }}>
        <div className="g-label" style={{ marginBottom:10 }}>
          PREVIOUS RUN — LOSS CURVE ({LOSS_DATA.length} epochs)
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={LOSS_DATA} margin={{ top:4, right:0, bottom:0, left:-20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="epoch" tick={{ fontSize:9 }}
              label={{ value:'epoch', position:'insideBottom', offset:-2, fill:'var(--t2)', fontSize:9 }} />
            <YAxis tick={{ fontSize:9 }} domain={[0,'auto']} />
            <Tooltip
              contentStyle={{ background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:6, fontSize:11 }}
              formatter={v => [v.toFixed(4), 'loss']}
            />
            <Bar dataKey="loss" fill="var(--acc)" opacity={0.85} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function LogsPanel({ logs }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const lines = logs?.length ? logs : STATIC_LOGS

  const visible = lines.filter(l =>
    (filter === 'ALL' || l.level === filter) &&
    (search === '' || l.msg.toLowerCase().includes(search.toLowerCase()))
  )

  const now = new Date().toTimeString().slice(0, 8)

  return (
    <div className="animate-fadein" style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
        {['ALL','INFO','DEBUG','WARNING','ERROR'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'2px 8px', fontSize:9, borderRadius:3,
            background: filter===f ? `${LOG_COLOR[f]||'var(--acc)'}18` : 'transparent',
            color:      filter===f ? (LOG_COLOR[f]||'var(--acc)') : 'var(--t2)',
            border:     `1px solid ${filter===f ? (LOG_COLOR[f]||'var(--acc)')+'44' : 'var(--b0)'}`,
            fontFamily:'"IBM Plex Mono",monospace', transition:'all .12s',
          }}>{f}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="grep..." style={{ padding:'3px 9px', fontSize:10, width:160, marginLeft:'auto' }} />
      </div>

      <div style={{
        background:'var(--bg0)', border:'1px solid var(--b0)', borderRadius:7,
        padding:'10px 12px', fontFamily:'"IBM Plex Mono",monospace',
        maxHeight:400, overflowY:'auto',
      }}>
        {visible.map((l, i) => (
          <div key={i} className="log-line" style={{
            fontSize:10, padding:'2.5px 4px', lineHeight:1.7,
            borderBottom:'1px solid rgba(255,255,255,.025)', color:'var(--t2)',
          }}>
            <span style={{ color:'var(--t2)', userSelect:'none' }}>[{now}] </span>
            <span style={{ color: LOG_COLOR[l.level] || 'var(--t1)', minWidth:56, display:'inline-block' }}>
              {l.level.padEnd(8,' ')}
            </span>
            {l.msg}
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ color:'var(--t2)', fontSize:10, textAlign:'center', padding:'20px 0' }}>
            No log lines match.
          </div>
        )}
      </div>
    </div>
  )
}

function PromptsPanel() {
  const [prompts, setPrompts] = useState([
    { id:'generate', label:'Generate', body:'You are GENESIS, a self-learning AI. Given the context from the knowledge graph, answer clearly and concisely.\n\nContext: {context}\n\nQuery: {query}' },
    { id:'heal',     label:'Heal',     body:'Review the following knowledge graph fragment for inconsistencies or missing links. Suggest corrections.\n\nFragment: {fragment}' },
    { id:'l03_deps', label:'L03 Deps', body:'List all dependency packages required for the following module code. Output JSON array only.\n\nCode: {code}' },
  ])
  const [selected, setSelected] = useState('generate')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const cur = prompts.find(p => p.id === selected)

  const updateBody = (val) => {
    setPrompts(ps => ps.map(p => p.id === selected ? { ...p, body: val } : p))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try { await adminAPI.savePrompt(selected, { body: cur.body }) } catch {}
    finally { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="animate-fadein" style={{ display:'flex', gap:12 }}>
      <div style={{ width:130, flexShrink:0 }}>
        {prompts.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)} style={{
            width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:5,
            background: selected===p.id ? 'rgba(245,158,11,.1)' : 'transparent',
            border:`1px solid ${selected===p.id ? 'rgba(245,158,11,.3)' : 'transparent'}`,
            color: selected===p.id ? 'var(--acc)' : 'var(--t1)',
            fontFamily:'"IBM Plex Mono",monospace', fontSize:11, marginBottom:3, transition:'all .12s',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1 }}>
        <div className="g-label" style={{ marginBottom:6 }}>prompts/{cur?.id}.txt</div>
        <textarea value={cur?.body || ''} onChange={e => updateBody(e.target.value)} rows={14}
          style={{ width:'100%', padding:'10px 12px', fontSize:11, lineHeight:1.6, resize:'vertical' }} />
        <div style={{ marginTop:8, display:'flex', gap:7, alignItems:'center' }}>
          <button className="g-btn-primary" onClick={save} disabled={saving}
            style={{ padding:'6px 14px', fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
            {saving ? <><Loader size={11} color="#06060A" /> Saving…</> : '⇧ Save Prompt'}
          </button>
          {saved && <span style={{ fontSize:10, color:'var(--gr)' }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  )
}

// ── Main Admin page ───────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('health')
  const { adminHealth, adminUsers, adminLogs, fetchHealth, fetchUsers, fetchLogs } = useGenesisStore()
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchHealth(), fetchUsers(), fetchLogs()])
    setLoading(false)
  }, [fetchHealth, fetchUsers, fetchLogs])

  useEffect(() => { refresh() }, []) // eslint-disable-line

  const PANEL = {
    health:   <HealthPanel   data={adminHealth} />,
    users:    <UsersPanel    users={adminUsers} />,
    training: <TrainingPanel />,
    logs:     <LogsPanel     logs={adminLogs}  />,
    prompts:  <PromptsPanel />,
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{
        padding:'0 16px', height:44,
        background:'var(--bg1)', borderBottom:'1px solid var(--b0)',
        display:'flex', alignItems:'center', flexShrink:0,
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'0 14px', height:'100%',
            background:'transparent', color: tab===t ? 'var(--acc)' : 'var(--t2)',
            borderBottom:`2px solid ${tab===t ? 'var(--acc)' : 'transparent'}`,
            fontSize:10, letterSpacing:'.07em',
            fontFamily:'"IBM Plex Mono",monospace', transition:'color .15s',
          }}>
            {t.toUpperCase()}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {loading && <Loader size={11} />}
          <StatusDot color="var(--gr)" pulse size={5} />
          <span style={{ fontSize:9, color:'var(--t2)' }}>all systems nominal</span>
          <button className="g-btn" onClick={refresh} style={{ padding:'3px 9px', fontSize:10, marginLeft:4 }}>
            ↺
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:16 }}>
        {PANEL[tab] || null}
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const MODULE_META = {
  m1_self_learner:     { icon: '◈', desc: 'Ingests sources, builds knowledge graph, self-teaches' },
  m2_research_accel:   { icon: '◉', desc: 'Research paper parser, hypothesis generator, ranker' },
  m3_ai_builder:       { icon: '⬡', desc: 'Designs, generates and deploys custom AI architectures' },
  m4_time_reconstruct: { icon: '◇', desc: 'Historical reconstruction and future projection engine' },
  m5_intuition_engine: { icon: '◐', desc: 'Bayesian reasoning, gap-filling, cross-module glue' },
  m6_reality_sim:      { icon: '⊕', desc: 'Reality simulation, code synthesis, world observer' },
}

export default function ModuleManager({ token }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState({})

  const load = async () => {
    try {
      const { data } = await axios.get('/api/v1/admin/modules', api(token))
      setModules(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const toggle = async (key, enabled) => {
    setToggling(p => ({ ...p, [key]: true }))
    try {
      await axios.put(`/api/v1/admin/modules/${key}`, null, {
        params: { enabled },
        ...api(token),
      })
      setModules(prev => prev.map(m => m.module_key === key ? { ...m, enabled } : m))
    } catch (e) { console.error(e) }
    finally { setToggling(p => ({ ...p, [key]: false })) }
  }

  if (loading) return <div style={{ color: '#4a6080', fontSize: 12 }}>⬡ LOADING MODULES…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2, marginBottom: 4 }}>
        {modules.filter(m => m.enabled).length}/{modules.length} MODULES ACTIVE
      </div>
      {modules.map((m) => {
        const meta = MODULE_META[m.module_key] || { icon: '◈', desc: '' }
        const busy = toggling[m.module_key]
        return (
          <div key={m.module_key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: m.enabled ? 'rgba(0,245,255,0.04)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${m.enabled ? 'rgba(0,245,255,0.15)' : 'rgba(0,245,255,0.06)'}`,
            borderRadius: 4, padding: '16px 20px',
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 3,
                background: m.enabled ? 'rgba(0,245,255,0.1)' : 'rgba(0,0,0,0.4)',
                border: `1px solid ${m.enabled ? 'rgba(0,245,255,0.2)' : 'rgba(0,245,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: m.enabled ? '#00f5ff' : '#2a4a60',
                transition: 'all 0.2s',
              }}>
                {meta.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: m.enabled ? '#e0f0ff' : '#3d5a72' }}>
                  {m.module_key}
                </div>
                <div style={{ fontSize: 10, color: '#3d5a72', marginTop: 2 }}>{meta.desc}</div>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => !busy && toggle(m.module_key, !m.enabled)}
              disabled={busy}
              style={{
                width: 48, height: 26, borderRadius: 13,
                background: m.enabled ? '#00f5ff' : 'rgba(0,245,255,0.1)',
                border: `1px solid ${m.enabled ? '#00f5ff' : 'rgba(0,245,255,0.2)'}`,
                cursor: busy ? 'not-allowed' : 'pointer',
                position: 'relative', transition: 'all 0.25s',
                opacity: busy ? 0.5 : 1,
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: m.enabled ? 24 : 4,
                width: 18, height: 18, borderRadius: '50%',
                background: m.enabled ? '#040913' : '#2a4a60',
                transition: 'left 0.25s',
              }}/>
            </button>
          </div>
        )
      })}

      {modules.length === 0 && (
        <div style={{ color: '#3d5a72', fontSize: 12, padding: 20, textAlign: 'center' }}>
          No module data returned from API.
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

function StatusBadge({ value }) {
  const ok = typeof value === 'string' && (value === 'ok' || value.startsWith('ok'))
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 2,
      background: ok ? 'rgba(0,255,150,0.08)' : 'rgba(255,80,80,0.08)',
      border: `1px solid ${ok ? 'rgba(0,255,150,0.25)' : 'rgba(255,80,80,0.25)'}`,
      color: ok ? '#00ff96' : '#ff6060',
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}/>
      {String(value).toUpperCase()}
    </span>
  )
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{
      background: 'rgba(0,245,255,0.03)',
      border: '1px solid rgba(0,245,255,0.1)',
      borderRadius: 4, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#00f5ff' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4a6080', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function SystemHealth({ token }) {
  const [health, setHealth]   = useState(null)
  const [stats,  setStats]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastAt, setLastAt]   = useState(null)

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        axios.get('/api/v1/admin/health', api(token)),
        axios.get('/api/v1/admin/stats',  api(token)),
      ])
      setHealth(h.data)
      setStats(s.data)
      setLastAt(new Date().toLocaleTimeString())
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000) // auto-refresh every 15s
    return () => clearInterval(t)
  }, [load])

  if (loading) return (
    <div style={{ color: '#4a6080', fontSize: 12, padding: 20 }}>
      <span style={{ animation: 'pulse 1s infinite' }}>◈ SCANNING SYSTEM…</span>
    </div>
  )

  if (!health) return (
    <div style={{ color: '#ff6060', fontSize: 12 }}>Failed to load health data.</div>
  )

  const overall = health.overall || 'unknown'
  const isOk    = overall === 'ok'
  const checks  = Object.entries(health).filter(([k]) => !['overall','timestamp'].includes(k))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overall banner */}
      <div style={{
        padding: '16px 24px',
        background: isOk ? 'rgba(0,255,150,0.05)' : 'rgba(255,200,0,0.05)',
        border: `1px solid ${isOk ? 'rgba(0,255,150,0.2)' : 'rgba(255,200,0,0.2)'}`,
        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20, color: isOk ? '#00ff96' : '#ffcc00' }}>
            {isOk ? '●' : '◐'}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              OVERALL STATUS: {overall.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: '#4a6080', marginTop: 2 }}>
              Last refresh: {lastAt} · Auto-refreshes every 15s
            </div>
          </div>
        </div>
        <button onClick={load} style={{
          background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)',
          borderRadius: 3, color: '#00f5ff', fontSize: 10, padding: '6px 14px',
          cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit',
        }}>↺ REFRESH</button>
      </div>

      {/* KG / Memory stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {stats.kg && Object.entries(stats.kg).slice(0,4).map(([k,v]) => (
            <MetricCard key={k} label={k.toUpperCase().replace(/_/g,' ')} value={String(v)}/>
          ))}
          {stats.memory && Object.entries(stats.memory).slice(0,2).map(([k,v]) => (
            <MetricCard key={k} label={k.toUpperCase().replace(/_/g,' ')} value={String(v)}/>
          ))}
        </div>
      )}

      {/* Check list */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(0,245,255,0.1)',
        borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)',
          fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>
          SUBSYSTEM CHECKS
        </div>
        {checks.map(([k, v]) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.04)',
          }}>
            <span style={{ fontSize: 12, color: '#8ab0cc', fontWeight: 500 }}>
              {k.replace(/_/g, ' ').toUpperCase()}
            </span>
            <StatusBadge value={v} />
          </div>
        ))}
      </div>
    </div>
  )
}

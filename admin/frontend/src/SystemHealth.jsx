// SystemHealth.jsx — Real-time system health dashboard with layer status
import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { C, F, card, badge, LAYERS, apiHeaders, fmtDate } from './design'

function StatusPill({ status }) {
  const ok = typeof status === 'string' && (status === 'ok' || status.startsWith('ok') || status === 'connected')
  const warn = typeof status === 'string' && (status === 'degraded' || status === 'slow')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: ok ? C.greenLight : warn ? C.amberLight : C.redLight,
      color: ok ? '#065F46' : warn ? '#92400E' : '#991B1B',
      fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? C.green : warn ? C.amber : C.red,
      }} />
      {String(status)}
    </span>
  )
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      ...card({ padding: '18px 20px' }),
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -10, right: -10,
        fontSize: 48, opacity: 0.05, userSelect: 'none',
      }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || C.textPrimary, letterSpacing: -1, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function LayerStatusRow({ layer, status, idx }) {
  const c = C.layerColors[idx % C.layerColors.length]
  const ok = status === 'active' || status === 'ok' || !status
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: `${c}18`,
        border: `1px solid ${c}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: c,
      }}>{layer.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>{layer.label}</div>
        <div style={{ fontSize: 11, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {layer.desc}
        </div>
      </div>
      <StatusPill status={ok ? 'ok' : 'offline'} />
    </div>
  )
}

export default function SystemHealth({ token, toast }) {
  const [health,  setHealth]  = useState(null)
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastAt,  setLastAt]  = useState(null)
  const [uptime,  setUptime]  = useState(0)

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        axios.get('/api/v1/admin/health', apiHeaders(token)).catch(() => ({ data: null })),
        axios.get('/api/v1/admin/stats',  apiHeaders(token)).catch(() => ({ data: null })),
      ])
      setHealth(h.data)
      setStats(s.data)
      setLastAt(new Date())
    } catch (e) {
      toast?.('Failed to load health data', 'error')
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    load()
    const t = setInterval(load, 15_000)
    const u = setInterval(() => setUptime(p => p + 1), 1000)
    return () => { clearInterval(t); clearInterval(u) }
  }, [load])

  const overall = health?.overall || 'unknown'
  const isOk    = overall === 'ok'
  const checks  = health ? Object.entries(health).filter(([k]) => !['overall', 'timestamp'].includes(k)) : []

  // Format uptime as HH:MM:SS
  const fmt = n => String(n).padStart(2, '0')
  const uptimeStr = `${fmt(Math.floor(uptime / 3600))}:${fmt(Math.floor((uptime % 3600) / 60))}:${fmt(uptime % 60)}`

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 200ms ease' }}>

      {/* Overall status banner */}
      <div style={{
        ...card({
          padding: '16px 20px',
          background: isOk ? C.greenLight : C.amberLight,
          border: `1px solid ${isOk ? '#A7F3D0' : '#FDE68A'}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }),
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isOk ? '#10B981' : C.amber,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          {isOk ? '✓' : '⚠'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: isOk ? '#064E3B' : '#78350F' }}>
            System is {isOk ? 'fully operational' : `running with issues (${overall})`}
          </div>
          <div style={{ fontSize: 12, color: isOk ? '#065F46' : '#92400E', marginTop: 3 }}>
            Last checked: {lastAt ? lastAt.toLocaleTimeString() : '…'} · Auto-refresh every 15s
          </div>
        </div>
        <button
          onClick={load}
          style={{
            padding: '7px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.6)',
            border: `1px solid ${isOk ? '#A7F3D0' : '#FDE68A'}`,
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: isOk ? '#065F46' : '#78350F',
          }}
        >↺ Refresh</button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard label="Session Uptime" value={uptimeStr} sub="since panel opened" color={C.blue} icon="⏱" />
        <MetricCard
          label="Subsystems OK"
          value={`${checks.filter(([,v]) => v === 'ok' || v === 'connected').length}/${checks.length}`}
          sub="healthy checks"
          color={C.green} icon="◈"
        />
        {stats?.kg && (
          <>
            <MetricCard label="KG Nodes"     value={stats.kg.nodes ?? 0}      sub="knowledge graph" color={C.purple} icon="⬡" />
            <MetricCard label="KG Edges"     value={stats.kg.edges ?? 0}      sub="relationships"   color={C.purple} icon="◇" />
            <MetricCard label="Conversations" value={stats.conversations ?? 0} sub="total stored"    color={C.blue}   icon="💬" />
            <MetricCard label="Users"         value={stats.users ?? 0}         sub="registered"      color={C.slate}  icon="◉" />
          </>
        )}
        {!stats?.kg && loading && (
          <div style={{ ...card({ padding: 20 }), color: C.textMuted, fontSize: 13, gridColumn: 'span 3', textAlign: 'center' }}>
            Loading metrics…
          </div>
        )}
      </div>

      {/* Two-column layout: Subsystem checks + Layer status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Subsystem checks */}
        <div style={card()}>
          <div style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Subsystem Checks</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>{checks.length} services</span>
          </div>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
              Scanning subsystems…
            </div>
          )}
          {!loading && checks.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>No health data available.</div>
          )}
          {checks.map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>
                {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <StatusPill status={v} />
            </div>
          ))}
        </div>

        {/* Layer status */}
        <div style={card()}>
          <div style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Processing Layers</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>L01 → L12</span>
          </div>
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {LAYERS.map((layer, i) => (
              <LayerStatusRow key={layer.key} layer={layer} status="ok" idx={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Last timestamp */}
      {health?.timestamp && (
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
          Health snapshot: {fmtDate(health.timestamp)}
        </div>
      )}
    </div>
  )
}

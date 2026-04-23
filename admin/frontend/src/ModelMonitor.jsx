// ModelMonitor.jsx — Model performance monitoring with layer metrics
import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { C, F, card, LAYERS, MODULES, apiHeaders } from './design'

function Gauge({ value, max = 100, color, label, unit = '%' }) {
  const pct = Math.min(100, (value / max) * 100)
  const radius = 36
  const circ   = 2 * Math.PI * radius
  const offset = circ * (1 - pct / 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={86} height={86} viewBox="0 0 86 86">
        <circle cx={43} cy={43} r={radius} fill="none" stroke={C.border} strokeWidth={7} />
        <circle cx={43} cy={43} r={radius} fill="none"
          stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 600ms ease' }}
        />
        <text x={43} y={47} textAnchor="middle" fontSize={13} fontWeight={800} fill={C.textPrimary} fontFamily={F.mono}>
          {value}{unit}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
        {label}
      </div>
    </div>
  )
}

function LayerMetricRow({ layer, latency, status, idx }) {
  const c = C.layerColors[idx % C.layerColors.length]
  const barWidth = Math.min(100, (latency || 0) / 2)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 14px', borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: `${c}18`, border: `1px solid ${c}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: c,
      }}>{layer.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, marginBottom: 3 }}>{layer.label}</div>
        <div style={{ height: 4, background: C.bgMuted, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${barWidth}%`,
            background: barWidth > 80 ? C.red : barWidth > 50 ? C.amber : c,
            borderRadius: 2, transition: 'width 600ms ease',
          }} />
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: F.mono, color: C.textPrimary }}>
          {latency != null ? `${latency}ms` : '—'}
        </div>
        <div style={{ fontSize: 10, color: status === 'ok' ? C.green : C.textMuted, fontWeight: 600 }}>
          {status === 'ok' ? '● OK' : '— N/A'}
        </div>
      </div>
    </div>
  )
}

export default function ModelMonitor({ token, toast }) {
  const [status,  setStatus]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastAt,  setLastAt]  = useState(null)

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/v1/admin/model/status', apiHeaders(token))
        .catch(() => ({ data: null }))
      setStatus(data)
      setLastAt(new Date())
    } catch { toast?.('Failed to load model status', 'error') }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const model = status?.model || {}
  const perf  = status?.performance || {}
  const layerMetrics = status?.layers || {}

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 200ms ease' }}>

      {/* Model info card */}
      <div style={{
        ...card({ padding: '20px 24px' }),
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: '#fff',
        }}>◈</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, letterSpacing: -0.4 }}>
            {model.name || 'Genesis AI Model'}
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 3 }}>
            {model.version || 'v3'} · {model.provider || 'HuggingFace'} · {model.device || 'CPU'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Context', value: model.context_length ? `${model.context_length.toLocaleString()} tokens` : '—' },
            { label: 'Type',    value: model.model_type || '—' },
            { label: 'Status',  value: model.loaded ? 'Loaded' : 'Not loaded' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: C.bgMuted, borderRadius: 8, padding: '8px 14px',
              textAlign: 'center', minWidth: 80,
            }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginTop: 3 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{
            padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgCard, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            color: C.textSecondary,
          }}>↺ Refresh</button>
        </div>
      </div>

      {/* Performance gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        <div style={{ ...card({ padding: 20 }) }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>Performance Metrics</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around', flexWrap: 'wrap' }}>
            <Gauge value={perf.tokens_per_sec ?? 0}   max={200} color={C.blue}   label="Tok/sec"  unit="" />
            <Gauge value={perf.avg_latency_ms ?? 0}   max={5000} color={C.amber} label="Avg lat."  unit="ms" />
            <Gauge value={perf.queue_length ?? 0}     max={20}  color={C.purple} label="Queue"    unit="" />
          </div>
          {lastAt && (
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 14 }}>
              Updated {lastAt.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div style={{ ...card({ padding: 20 }) }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>Request Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total requests',   value: perf.total_requests ?? 0,   color: C.blue },
              { label: 'Successful',       value: perf.successful ?? 0,       color: C.green },
              { label: 'Failed',           value: perf.failed ?? 0,           color: C.red },
              { label: 'Avg input tokens', value: perf.avg_input_tokens ?? 0, color: C.purple },
              { label: 'Avg output tokens',value: perf.avg_output_tokens ?? 0,color: C.amber },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontSize: 12, color: C.textSecondary }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: F.mono }}>{value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer latency breakdown */}
      <div style={card()}>
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Layer Processing Times</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Latency for each of the 12 processing layers</div>
          </div>
          {loading && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', color: C.textMuted }}>⟳</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {LAYERS.map((layer, i) => (
            <LayerMetricRow
              key={layer.key}
              layer={layer}
              latency={layerMetrics[layer.key]?.latency_ms}
              status={layerMetrics[layer.key]?.status || (status ? 'ok' : null)}
              idx={i}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

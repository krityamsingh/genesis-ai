// ModuleManager.jsx — Modules & Layers dashboard
// Shows M1–M6 with their linked L01–L12 layers, toggle, config, status
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { C, F, card, LAYERS, MODULES, apiHeaders } from './design'

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative',
        background: enabled ? C.blue : '#CBD5E1',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 200ms', padding: 0, flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: enabled ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        transition: 'left 200ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function LayerPill({ layer, active, idx }) {
  const c = C.layerColors[idx % C.layerColors.length]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 5,
      background: active ? `${c}18` : '#F1F5F9',
      border: `1px solid ${active ? `${c}40` : C.border}`,
      color: active ? c : C.textMuted,
      fontSize: 11, fontWeight: 600,
      transition: 'all 200ms',
    }}>
      {layer.icon} {layer.label}
    </span>
  )
}

function ModuleCard({ mod, moduleKey, enabled, onToggle, loading }) {
  const meta = MODULES[moduleKey] || {}
  const linkedLayers = LAYERS.filter(l => meta.layers?.includes(l.key))
  const unlinkedLayers = LAYERS.filter(l => !meta.layers?.includes(l.key))
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      ...card(),
      overflow: 'hidden',
      transition: 'box-shadow 200ms',
      opacity: loading ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
        borderBottom: expanded ? `1px solid ${C.border}` : 'none',
        cursor: 'pointer',
      }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: enabled ? `${meta.color}18` : '#F1F5F9',
          border: `1px solid ${enabled ? `${meta.color}40` : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: enabled ? meta.color : C.textMuted,
          transition: 'all 200ms',
        }}>
          {meta.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
              {meta.label}
            </span>
            <span style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 4,
              background: enabled ? C.greenLight : '#F1F5F9',
              color: enabled ? '#065F46' : C.textMuted,
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.desc}
          </div>
        </div>

        {/* Expand chevron */}
        <span style={{
          fontSize: 11, color: C.textMuted, marginRight: 4,
          transition: 'transform 200ms',
          transform: expanded ? 'rotate(180deg)' : 'none',
          display: 'inline-block',
        }}>▾</span>

        {/* Toggle */}
        <div onClick={e => e.stopPropagation()}>
          <Toggle
            enabled={enabled}
            onChange={v => onToggle(moduleKey, v)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Expanded: layer connections */}
      {expanded && (
        <div style={{ padding: '16px 20px', background: '#FAFBFC', borderTop: `1px solid ${C.border}` }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Active Processing Layers ({linkedLayers.length}/{LAYERS.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LAYERS.map((layer, i) => (
                <LayerPill
                  key={layer.key}
                  layer={layer}
                  active={meta.layers?.includes(layer.key)}
                  idx={i}
                />
              ))}
            </div>
          </div>

          {/* Layer pipeline diagram */}
          {linkedLayers.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Pipeline
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                overflowX: 'auto', paddingBottom: 4,
              }}>
                {linkedLayers.map((layer, i) => {
                  const layerIdx = LAYERS.findIndex(l => l.key === layer.key)
                  const c = C.layerColors[layerIdx % C.layerColors.length]
                  return (
                    <React.Fragment key={layer.key}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 4, flexShrink: 0,
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8,
                          background: `${c}18`, border: `1.5px solid ${c}60`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, color: c,
                        }}>{layer.icon}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, whiteSpace: 'nowrap' }}>
                          {layer.label.split(' ')[0]}
                        </div>
                      </div>
                      {i < linkedLayers.length - 1 && (
                        <div style={{
                          width: 20, height: 1,
                          background: `linear-gradient(90deg, ${C.layerColors[layerIdx % C.layerColors.length]}80, ${C.layerColors[(layerIdx + 1) % C.layerColors.length]}80)`,
                          flexShrink: 0, marginBottom: 16,
                        }} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ModuleManager({ token, toast }) {
  const [modules,  setModules]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState({})

  const load = async () => {
    try {
      const { data } = await axios.get('/api/v1/admin/modules', apiHeaders(token))
      setModules(Array.isArray(data) ? data : [])
    } catch { toast?.('Failed to load modules', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line

  const toggle = async (key, newState) => {
    setToggling(p => ({ ...p, [key]: true }))
    try {
      await axios.put(`/api/v1/admin/modules/${key}`, null, {
        params: { enabled: newState },
        ...apiHeaders(token),
      })
      setModules(prev => prev.map(m => m.module_key === key ? { ...m, enabled: newState } : m))
      toast?.(`${key} ${newState ? 'enabled' : 'disabled'}`, 'success')
    } catch { toast?.(`Failed to toggle ${key}`, 'error') }
    finally { setToggling(p => ({ ...p, [key]: false })) }
  }

  const activeCount = modules.filter(m => m.enabled).length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 200ms ease' }}>

      {/* Header stats */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          ...card({ padding: '14px 18px', flex: 1 }),
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: C.greenLight, border: `1px solid #A7F3D0`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: C.green,
          }}>◉</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, letterSpacing: -1 }}>
              {loading ? '…' : activeCount}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Modules
            </div>
          </div>
        </div>
        <div style={{
          ...card({ padding: '14px 18px', flex: 1 }),
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: C.blueLight, border: `1px solid #BFDBFE`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: C.blue,
          }}>⬡</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, letterSpacing: -1 }}>
              {LAYERS.length}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Processing Layers
            </div>
          </div>
        </div>
        <div style={{
          ...card({ padding: '14px 18px', flex: 1 }),
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: C.purpleLight, border: `1px solid #DDD6FE`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: C.purple,
          }}>⊕</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, letterSpacing: -1 }}>
              {loading ? '…' : modules.length - activeCount}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inactive Modules
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        ...card({ padding: '12px 16px', background: C.bgMuted }),
        fontSize: 12, color: C.textSecondary, lineHeight: 1.6,
      }}>
        <strong>Click any module card</strong> to expand and see its processing pipeline — which of the 12 layers it activates and in what order. Toggle to enable or disable a module. Changes persist in MongoDB.
      </div>

      {/* Module cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.textMuted, fontSize: 13 }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
          Loading modules…
        </div>
      ) : modules.length === 0 ? (
        <div style={{ ...card({ padding: 40 }), textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
          No modules found. Ensure the backend is running and modules are seeded.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {modules.map(m => (
            <ModuleCard
              key={m.module_key}
              moduleKey={m.module_key}
              mod={m}
              enabled={m.enabled}
              onToggle={toggle}
              loading={!!toggling[m.module_key]}
            />
          ))}
        </div>
      )}

      {/* Full layer reference */}
      <div style={card()}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>All 12 Processing Layers — Reference</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Complete pipeline from syntax to self-healing</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 0 }}>
          {LAYERS.map((layer, i) => {
            const c = C.layerColors[i % C.layerColors.length]
            return (
              <div key={layer.key} style={{
                display: 'flex', gap: 10, padding: '12px 16px',
                borderBottom: `1px solid ${C.border}`,
                borderRight: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                  background: `${c}14`, border: `1px solid ${c}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: c, marginTop: 1,
                }}>{layer.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{layer.label}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2, lineHeight: 1.4 }}>{layer.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

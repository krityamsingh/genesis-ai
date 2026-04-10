import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

function sizeLabel(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DatasetUploader({ token }) {
  const [datasets, setDatasets] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [msg,      setMsg]      = useState('')
  const [deleting, setDeleting] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/v1/admin/datasets', api(token))
      setDatasets(Array.isArray(data) ? data : (data.datasets || []))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const del = async (name) => {
    if (!confirm(`Delete dataset "${name}"?`)) return
    setDeleting(p => ({ ...p, [name]: true }))
    try {
      await axios.delete(`/api/v1/admin/datasets/${name}`, api(token))
      setMsg(`✓ Deleted: ${name}`)
      load()
    } catch(e) {
      setMsg('⚠ ' + (e.response?.data?.detail || 'Delete failed'))
    } finally {
      setDeleting(p => ({ ...p, [name]: false }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>
          {datasets.length} DATASETS REGISTERED
        </div>
        <button onClick={load} style={{
          background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 3, color: '#00f5ff', fontSize: 10,
          padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
        }}>↺ REFRESH</button>
      </div>

      {msg && (
        <div style={{
          padding: '8px 14px', borderRadius: 3, fontSize: 12,
          background: msg.startsWith('✓') ? 'rgba(0,255,150,0.06)' : 'rgba(255,80,80,0.06)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(0,255,150,0.2)' : 'rgba(255,80,80,0.2)'}`,
          color: msg.startsWith('✓') ? '#00ff96' : '#ff6060',
        }}>{msg}</div>
      )}

      {/* Note about upload */}
      <div style={{
        background: 'rgba(255,200,0,0.04)',
        border: '1px solid rgba(255,200,0,0.15)',
        borderRadius: 3, padding: '10px 16px',
        fontSize: 11, color: '#ffcc00', lineHeight: 1.6,
      }}>
        ⊟ Dataset ingestion happens via the <code style={{ background: 'rgba(255,200,0,0.1)', padding: '1px 5px', borderRadius: 2 }}>/api/v1/core/learn</code> endpoint.
        Use the Playground or the CLI to feed new sources. This panel shows registered datasets and allows deletion.
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,245,255,0.1)',
        borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 100px 80px',
          padding: '10px 20px', borderBottom: '1px solid rgba(0,245,255,0.08)',
          fontSize: 9, color: '#2a4a60', letterSpacing: 2,
        }}>
          <span>NAME</span><span>TYPE</span><span>SIZE</span><span/>
        </div>

        {loading ? (
          <div style={{ padding: 20, color: '#4a6080', fontSize: 12 }}>Loading datasets…</div>
        ) : datasets.length === 0 ? (
          <div style={{ padding: 24, color: '#3d5a72', fontSize: 12, textAlign: 'center' }}>
            No datasets found. Feed sources via /core/learn to populate.
          </div>
        ) : datasets.map((d) => {
          const name = typeof d === 'string' ? d : d.name
          const type = d.type || 'unknown'
          const size = d.size_bytes || d.size || null
          return (
            <div key={name} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 100px 80px',
              padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.04)',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: '#e0f0ff', fontWeight: 600 }}>{name}</span>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
                background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.12)',
                color: '#00f5ff', width: 'fit-content',
              }}>{type.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: '#4a6080' }}>{sizeLabel(size)}</span>
              <button onClick={() => del(name)} disabled={deleting[name]} style={{
                background: 'none', border: '1px solid rgba(255,60,60,0.2)',
                borderRadius: 2, color: '#ff6060', fontSize: 9,
                padding: '4px 10px', cursor: deleting[name] ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: deleting[name] ? 0.5 : 1,
              }}>
                {deleting[name] ? '…' : 'DELETE'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

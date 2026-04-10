import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function ModelMonitor({ token }) {
  const [info,    setInfo]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    axios.get('/api/v1/admin/model', api(token))
      .then(({ data }) => setInfo(data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load model info'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div style={{ color: '#4a6080', fontSize: 12 }}>◆ LOADING MODEL DATA…</div>
  if (error)   return <div style={{ color: '#ff6060', fontSize: 12 }}>⚠ {error}</div>
  if (!info)   return null

  // Separate key fields
  const primary   = ['model_id','model_name','status','device','dtype']
  const secondary = Object.keys(info).filter(k => !primary.includes(k))

  const Field = ({ k, v }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 20px', borderBottom: '1px solid rgba(0,245,255,0.04)',
    }}>
      <span style={{ fontSize: 11, color: '#4a6080', letterSpacing: 1 }}>
        {k.replace(/_/g,' ').toUpperCase()}
      </span>
      <span style={{ fontSize: 12, color: '#e0f0ff', fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>
        {String(v)}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,245,255,0.06) 0%, rgba(0,100,200,0.06) 100%)',
        border: '1px solid rgba(0,245,255,0.15)',
        borderRadius: 4, padding: '24px 28px',
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 4,
          background: 'rgba(0,245,255,0.08)',
          border: '1px solid rgba(0,245,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#00f5ff',
        }}>◆</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {info.model_name || info.model_id || 'Unknown Model'}
          </div>
          <div style={{ fontSize: 11, color: '#4a6080', letterSpacing: 1 }}>
            {info.dtype || ''}{info.device ? ` · ${info.device}` : ''}
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{
              background: info.status === 'loaded' ? 'rgba(0,255,150,0.1)' : 'rgba(255,200,0,0.1)',
              border: `1px solid ${info.status === 'loaded' ? 'rgba(0,255,150,0.3)' : 'rgba(255,200,0,0.3)'}`,
              color: info.status === 'loaded' ? '#00ff96' : '#ffcc00',
              borderRadius: 2, padding: '2px 10px', fontSize: 10, letterSpacing: 1,
            }}>
              {(info.status || 'unknown').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Primary fields */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)', fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>
          PRIMARY INFO
        </div>
        {primary.filter(k => info[k] !== undefined).map(k => <Field key={k} k={k} v={info[k]} />)}
      </div>

      {/* Secondary fields */}
      {secondary.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)', fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>
            ADDITIONAL INFO
          </div>
          {secondary.map(k => <Field key={k} k={k} v={info[k]} />)}
        </div>
      )}
    </div>
  )
}

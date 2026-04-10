import React, { useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const BLANK = { model_id: '', dataset_path: '', epochs: 3, lr: 2e-4, batch_size: 8 }

export default function TrainingPanel({ token }) {
  const [form,    setForm]    = useState(BLANK)
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const start = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg('')
    try {
      const { data } = await axios.post('/api/v1/admin/training/start', {
        model_id:     form.model_id,
        dataset_path: form.dataset_path,
        config: {
          epochs:     +form.epochs,
          lr:         +form.lr,
          batch_size: +form.batch_size,
        },
      }, api(token))
      setJobs(prev => [{
        ...data,
        started_at: new Date().toLocaleString(),
        id: data.task_id || Date.now(),
      }, ...prev])
      setMsg('✓ Training job queued: ' + data.task_id)
    } catch(e) {
      setMsg('⚠ ' + (e.response?.data?.detail || 'Failed to start training'))
    } finally { setLoading(false) }
  }

  const inp = (label, key, type = 'text', ph = '') => (
    <div>
      <div style={{ fontSize: 10, color: '#00f5ff', letterSpacing: 2, marginBottom: 5, opacity: 0.7 }}>
        {label}
      </div>
      <input
        type={type} value={form[key]} onChange={set(key)} placeholder={ph}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
          borderRadius: 3, padding: '8px 12px', color: '#e0f0ff', fontSize: 12,
          fontFamily: 'inherit', outline: 'none',
        }}
      />
    </div>
  )

  const statusColor = (s) => ({
    queued:    '#ffcc00',
    running:   '#00f5ff',
    complete:  '#00ff96',
    failed:    '#ff6060',
  }[s] || '#4a6080')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Warning */}
      <div style={{
        padding: '10px 16px', borderRadius: 3, fontSize: 11,
        background: 'rgba(255,200,0,0.04)', border: '1px solid rgba(255,200,0,0.15)',
        color: '#ffcc00', lineHeight: 1.6,
      }}>
        ⚙ Training runs asynchronously via Celery. Make sure a Celery worker and the model/dataset paths are correctly configured before launching a job.
      </div>

      {/* Form */}
      <form onSubmit={start} style={{
        background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.12)',
        borderRadius: 4, padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 10, color: '#00f5ff', letterSpacing: 3, marginBottom: 4 }}>
          LAUNCH FINE-TUNE JOB
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {inp('MODEL ID', 'model_id', 'text', 'e.g. gemma4-base')}
          {inp('DATASET PATH', 'dataset_path', 'text', '/data/datasets/my_data.jsonl')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {inp('EPOCHS', 'epochs', 'number', '3')}
          {inp('LEARNING RATE', 'lr', 'number', '0.0002')}
          {inp('BATCH SIZE', 'batch_size', 'number', '8')}
        </div>

        {msg && (
          <div style={{
            padding: '8px 12px', borderRadius: 3, fontSize: 12,
            background: msg.startsWith('✓') ? 'rgba(0,255,150,0.06)' : 'rgba(255,80,80,0.06)',
            border: `1px solid ${msg.startsWith('✓') ? 'rgba(0,255,150,0.2)' : 'rgba(255,80,80,0.2)'}`,
            color: msg.startsWith('✓') ? '#00ff96' : '#ff6060',
          }}>{msg}</div>
        )}

        <button type="submit" disabled={loading || !form.model_id || !form.dataset_path} style={{
          background: (loading || !form.model_id || !form.dataset_path)
            ? 'rgba(0,245,255,0.04)' : 'rgba(0,245,255,0.12)',
          border: '1px solid rgba(0,245,255,0.3)',
          borderRadius: 3, color: '#00f5ff', fontSize: 11, fontWeight: 700,
          padding: '11px 0', letterSpacing: 2,
          cursor: (loading || !form.model_id || !form.dataset_path) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.2s',
        }}>
          {loading ? '⚙ QUEUING…' : '⚙ START TRAINING JOB →'}
        </button>
      </form>

      {/* Job history (session) */}
      {jobs.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)',
            fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>
            SESSION JOBS
          </div>
          {jobs.map(j => (
            <div key={j.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 80px 1fr',
              padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.04)',
              alignItems: 'center', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#e0f0ff', fontWeight: 600 }}>{j.model_id}</div>
                <div style={{ fontSize: 9, color: '#3d5a72', marginTop: 2, fontFamily: 'inherit' }}>
                  {j.task_id}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#4a6080' }}>{j.dataset}</div>
              <span style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 2, letterSpacing: 1,
                color: statusColor(j.status),
                background: statusColor(j.status) + '18',
                border: `1px solid ${statusColor(j.status)}40`,
                width: 'fit-content',
              }}>
                {(j.status || 'queued').toUpperCase()}
              </span>
              <div style={{ fontSize: 10, color: '#3d5a72' }}>{j.started_at}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// TrainingPanel.jsx — Training job management
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { C, F, card, btn, input, th, td, apiHeaders } from './design'

const BLANK = { model_id: '', dataset_path: '', epochs: 3, lr: '2e-4', batch_size: 8, domain: '' }

const STATUS_STYLES = {
  queued:   { bg: C.amberLight,  color: '#92400E', icon: '⏳' },
  running:  { bg: C.blueLight,   color: '#1D4ED8', icon: '⟳' },
  complete: { bg: C.greenLight,  color: '#065F46', icon: '✓'  },
  failed:   { bg: C.redLight,    color: '#991B1B', icon: '✕'  },
}

export default function TrainingPanel({ token, toast }) {
  const [form,    setForm]    = useState(BLANK)
  const [jobs,    setJobs]    = useState([])
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const loadJobs = async () => {
    try {
      const [j, d] = await Promise.all([
        axios.get('/api/v1/training/jobs', apiHeaders(token)).catch(() => ({ data: [] })),
        axios.get('/api/v1/training/domains', apiHeaders(token)).catch(() => ({ data: [] })),
      ])
      setJobs(Array.isArray(j.data) ? j.data : j.data?.jobs || [])
      setDomains(Array.isArray(d.data) ? d.data : [])
    } catch {}
  }

  useEffect(() => { loadJobs() }, [token]) // eslint-disable-line

  const start = async () => {
    if (!form.model_id || !form.dataset_path) { toast?.('Model ID and dataset path are required', 'error'); return }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/v1/training/jobs', {
        model_id: form.model_id,
        dataset_path: form.dataset_path,
        domain: form.domain,
        config: { epochs: +form.epochs, lr: +form.lr, batch_size: +form.batch_size },
      }, apiHeaders(token))
      toast?.(`Training job ${data.task_id || 'queued'} started`, 'success')
      setForm(BLANK); loadJobs()
    } catch (e) {
      toast?.(e.response?.data?.detail || 'Failed to start training', 'error')
    } finally { setLoading(false) }
  }

  const cancel = async (jobId) => {
    if (!window.confirm('Cancel this training job?')) return
    try {
      await axios.delete(`/api/v1/training/jobs/${jobId}`, apiHeaders(token))
      toast?.('Job cancelled', 'success'); loadJobs()
    } catch { toast?.('Failed to cancel job', 'error') }
  }

  const Field = ({ label, k, type = 'text', ph = '', children }) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children || (
        <input type={type} placeholder={ph} value={form[k]} onChange={set(k)}
          style={{ ...input(), fontSize: 13 }} />
      )}
    </div>
  )

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 200ms ease' }}>

      {/* Warning */}
      <div style={{
        ...card({ padding: '12px 16px', background: C.amberLight, border: `1px solid #FDE68A` }),
        fontSize: 13, color: '#78350F', lineHeight: 1.6,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚙</span>
        <span>Training runs asynchronously via Celery workers. Ensure workers are running and the model/dataset paths exist on the server before launching.</span>
      </div>

      {/* Launch form */}
      <div style={card({ padding: 20 })}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>Launch Training Job</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          <Field label="Model ID / Path" k="model_id" ph="google/gemma-2b-it" />
          <Field label="Dataset Path" k="dataset_path" ph="/data/dataset.jsonl" />
          <Field label="Domain">
            <select value={form.domain} onChange={set('domain')}
              style={{ ...input(), fontSize: 13, appearance: 'none', cursor: 'pointer' }}>
              <option value="">Select domain…</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Epochs" k="epochs" type="number" ph="3" />
          <Field label="Learning Rate" k="lr" type="text" ph="2e-4" />
          <Field label="Batch Size" k="batch_size" type="number" ph="8" />
        </div>
        <button
          onClick={start} disabled={loading}
          style={{ ...btn('primary'), opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Starting…</> : '⚙ Launch Training'}
        </button>
      </div>

      {/* Jobs table */}
      <div style={card()}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Training Jobs</span>
          <button onClick={loadJobs} style={{ ...btn('ghost'), fontSize: 12 }}>↺ Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Job ID', 'Model', 'Domain', 'Config', 'Status', 'Started', 'Actions'].map(h => <th key={h} style={th()}>{h}</th>)}
            </tr></thead>
            <tbody>
              {jobs.length === 0 && (
                <tr><td colSpan={7} style={{ ...td(), textAlign: 'center', color: C.textMuted, padding: 24 }}>No training jobs yet.</td></tr>
              )}
              {jobs.map(j => {
                const s = STATUS_STYLES[j.status] || STATUS_STYLES.queued
                return (
                  <tr key={j.id || j.task_id}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 100ms' }}
                  >
                    <td style={{ ...td(), fontFamily: F.mono, fontSize: 11, color: C.textMuted }}>{(j.task_id || j.id || '').toString().slice(0, 14)}…</td>
                    <td style={{ ...td(), fontSize: 12 }}>{j.model_id || '—'}</td>
                    <td style={{ ...td(), fontSize: 12 }}>{j.domain || '—'}</td>
                    <td style={{ ...td(), fontSize: 11, color: C.textSecondary }}>
                      e={j.config?.epochs}, lr={j.config?.lr}, bs={j.config?.batch_size}
                    </td>
                    <td style={td()}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ animation: j.status === 'running' ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>{s.icon}</span>
                        {j.status}
                      </span>
                    </td>
                    <td style={{ ...td(), fontSize: 11, color: C.textSecondary }}>
                      {j.started_at ? new Date(j.started_at).toLocaleString() : '—'}
                    </td>
                    <td style={td()}>
                      {['queued', 'running'].includes(j.status) && (
                        <button onClick={() => cancel(j.id || j.task_id)} style={{ ...btn('danger'), padding: '3px 10px', fontSize: 11 }}>Cancel</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

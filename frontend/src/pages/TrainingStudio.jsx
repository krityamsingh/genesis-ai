// pages/TrainingStudio.jsx
// GENESIS — Training Studio (Section E)
//
// Allows users/admins to:
//   1. Pick a domain (Trading, Medical, Legal, Code, Custom)
//   2. Upload a .jsonl dataset file
//   3. Preview the domain's system prompt
//   4. Start training (POST /api/v1/training/jobs)
//   5. Watch live progress bar via polling + WebSocket
//   6. See "Open in Chat" button when done → auto-route to new module
//
// On completion, a "module_added" WS event fires automatically
// (from Celery on_success) and the sidebar refreshes.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const DOMAINS = [
  { id: 'trading', label: '📈 Trading',  desc: 'Financial markets, TA, portfolio management' },
  { id: 'medical', label: '🏥 Medical',  desc: 'Clinical reasoning, symptoms, treatment plans' },
  { id: 'legal',   label: '⚖️  Legal',   desc: 'Contract analysis, statutes, case law' },
  { id: 'code',    label: '💻 Code',     desc: 'Code review, debugging, architecture' },
  { id: 'custom',  label: '✨ Custom',   desc: 'Your own domain and system prompt' },
]

export default function TrainingStudio() {
  const navigate = useNavigate()

  // Step state
  const [step,         setStep]         = useState(1)   // 1=domain, 2=dataset, 3=prompt, 4=training
  const [domain,       setDomain]       = useState(null)
  const [modelName,    setModelName]    = useState('')
  const [file,         setFile]         = useState(null)
  const [promptPreview, setPromptPreview] = useState('')
  const [domains,      setDomainsData]  = useState([])

  // Training state
  const [jobId,        setJobId]        = useState(null)
  const [jobStatus,    setJobStatus]    = useState(null)   // pending|training|done|failed
  const [progress,     setProgress]     = useState(0)
  const [error,        setError]        = useState(null)
  const [loading,      setLoading]      = useState(false)

  // Jobs list
  const [jobs,         setJobs]         = useState([])

  const pollRef = useRef(null)

  // ── Load domains on mount ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/training/domains')
      .then(r => setDomainsData(r.data.domains || []))
      .catch(() => {})

    api.get('/training/jobs')
      .then(r => setJobs(r.data || []))
      .catch(() => {})
  }, [])

  // ── Poll job status while training ────────────────────────────────────────
  const startPolling = useCallback((id) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/training/jobs/${id}`)
        setProgress(data.progress_pct || 0)
        setJobStatus(data.status)
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(pollRef.current)
          setJobs(prev => {
            const filtered = prev.filter(j => j.job_id !== id)
            return [data, ...filtered]
          })
        }
      } catch {}
    }, 2500)
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // ── Domain selection ───────────────────────────────────────────────────────
  const selectDomain = (d) => {
    setDomain(d.id)
    const info = domains.find(x => x.domain === d.id)
    setPromptPreview(info?.prompt_preview || `System prompt for ${d.id} domain...`)
    setStep(2)
  }

  // ── File validation ────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.jsonl') && !f.name.endsWith('.json')) {
      setError('Please upload a .jsonl or .json file')
      return
    }
    setFile(f)
    setError(null)
  }

  // ── Start training ─────────────────────────────────────────────────────────
  const startTraining = async () => {
    if (!file || !domain || !modelName.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('domain', domain)
    fd.append('name', modelName.trim())
    fd.append('dataset', file)

    try {
      const { data } = await api.post('/training/jobs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setJobId(data.job_id)
      setJobStatus(data.status)
      setProgress(0)
      setStep(4)
      startPolling(data.job_id)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'object' && detail.error) {
        setError(`Validation failed: ${detail.failed_rows} rows rejected. First: ${detail.sample_failures?.[0]?.reason}`)
      } else {
        setError(typeof detail === 'string' ? detail : 'Training start failed')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Open in Chat ───────────────────────────────────────────────────────────
  const openInChat = () => {
    navigate(`/chat?module=${domain}_v1`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Training Studio</h1>
      <p style={styles.subtitle}>Train a domain-specific AI module and add it directly to chat</p>

      {/* Progress breadcrumb */}
      <div style={styles.breadcrumb}>
        {['Domain', 'Dataset', 'Preview', 'Training'].map((s, i) => (
          <div key={s} style={{...styles.crumb, ...(step === i+1 ? styles.crumbActive : step > i+1 ? styles.crumbDone : {})}}>
            <span style={styles.crumbNum}>{step > i+1 ? '✓' : i+1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Domain Picker */}
      {step === 1 && (
        <div>
          <h2 style={styles.sectionTitle}>Choose a domain</h2>
          <div style={styles.domainGrid}>
            {DOMAINS.map(d => (
              <button key={d.id} style={styles.domainCard} onClick={() => selectDomain(d)}>
                <div style={styles.domainLabel}>{d.label}</div>
                <div style={styles.domainDesc}>{d.desc}</div>
              </button>
            ))}
          </div>

          {/* Past jobs */}
          {jobs.length > 0 && (
            <div style={{marginTop: 40}}>
              <h2 style={styles.sectionTitle}>Past jobs</h2>
              <div style={styles.jobList}>
                {jobs.map(j => (
                  <div key={j.job_id} style={styles.jobRow}>
                    <span style={styles.jobName}>{j.name}</span>
                    <span style={{...styles.badge, backgroundColor: statusColor(j.status)}}>{j.status}</span>
                    <div style={styles.miniBar}>
                      <div style={{...styles.miniBarFill, width: `${j.progress_pct}%`}} />
                    </div>
                    {j.status === 'done' && (
                      <button style={styles.smallBtn} onClick={() => navigate(`/chat?module=${j.domain}_v1`)}>
                        Open in Chat →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Dataset Upload */}
      {step === 2 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Upload dataset</h2>
          <p style={styles.hint}>
            A <code>.jsonl</code> file where each line is a JSON object with a <code>"text"</code> field.
            Each row will be validated through the Layer Manager before training starts.
          </p>

          <label style={styles.label}>Model name</label>
          <input
            style={styles.input}
            placeholder={`e.g. "Trading AI v1"`}
            value={modelName}
            onChange={e => setModelName(e.target.value)}
          />

          <label style={styles.label}>Dataset file (.jsonl)</label>
          <input type="file" accept=".jsonl,.json" onChange={handleFile} style={styles.fileInput} />
          {file && <p style={styles.fileInfo}>✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <button style={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
            <button style={styles.nextBtn} disabled={!file || !modelName} onClick={() => setStep(3)}>
              Preview prompt →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Prompt Preview */}
      {step === 3 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>System prompt preview</h2>
          <p style={styles.hint}>
            This prompt is prepended to every conversation with the trained model.
            It shapes its personality, knowledge scope, and safety behaviour.
          </p>
          <pre style={styles.promptBox}>{promptPreview || `Loading prompt for "${domain}"...`}</pre>
          {error && <p style={styles.error}>{error}</p>}
          <div style={styles.actions}>
            <button style={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
            <button style={styles.trainBtn} disabled={loading} onClick={startTraining}>
              {loading ? 'Validating dataset...' : '🚀 Start Training'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Training Progress */}
      {step === 4 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {jobStatus === 'done' ? '✅ Training complete!' : jobStatus === 'failed' ? '❌ Training failed' : '⚡ Training in progress...'}
          </h2>

          <div style={styles.progressTrack}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>
          <p style={styles.progressLabel}>{progress}% complete</p>

          {jobStatus === 'training' && (
            <p style={styles.hint}>Training is running on the GPU worker. This may take 10–60 minutes depending on dataset size.</p>
          )}
          {jobStatus === 'done' && (
            <div style={styles.successBox}>
              <p>Your model is ready and has been added to the chat sidebar under "Trained models".</p>
              <button style={styles.openBtn} onClick={openInChat}>Open in Chat →</button>
            </div>
          )}
          {jobStatus === 'failed' && (
            <p style={styles.error}>Training failed. Check the Celery worker logs for details.</p>
          )}

          <button style={{...styles.backBtn, marginTop: 24}} onClick={() => { setStep(1); setJobId(null); setJobStatus(null); setProgress(0) }}>
            ← Start another job
          </button>
        </div>
      )}
    </div>
  )
}

function statusColor(s) {
  return { done: '#22c55e', failed: '#ef4444', training: '#f59e0b', pending: '#6366f1' }[s] || '#64748b'
}

const styles = {
  container:    { maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#e2e8f0' },
  title:        { fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#f1f5f9' },
  subtitle:     { color: '#94a3b8', marginBottom: 32 },
  breadcrumb:   { display: 'flex', gap: 8, marginBottom: 40 },
  crumb:        { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
                  background: '#1e293b', color: '#64748b', fontSize: 13 },
  crumbActive:  { background: '#4f46e5', color: '#fff' },
  crumbDone:    { background: '#16a34a', color: '#fff' },
  crumbNum:     { fontWeight: 700, minWidth: 18 },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#f1f5f9' },
  domainGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  domainCard:   { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 16px',
                  textAlign: 'left', cursor: 'pointer', transition: 'all .15s',
                  ':hover': { border: '1px solid #4f46e5' } },
  domainLabel:  { fontSize: 16, fontWeight: 600, marginBottom: 6, color: '#f1f5f9' },
  domainDesc:   { fontSize: 13, color: '#94a3b8' },
  card:         { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 32 },
  hint:         { color: '#94a3b8', fontSize: 14, marginBottom: 20, lineHeight: 1.6 },
  label:        { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 },
  input:        { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
                  padding: '10px 14px', color: '#f1f5f9', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' },
  fileInput:    { display: 'block', marginBottom: 12, color: '#94a3b8' },
  fileInfo:     { color: '#22c55e', fontSize: 13, marginBottom: 16 },
  error:        { color: '#ef4444', fontSize: 13, marginBottom: 12 },
  promptBox:    { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 16,
                  color: '#94a3b8', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto', marginBottom: 24 },
  actions:      { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  backBtn:      { background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '10px 20px',
                  color: '#94a3b8', cursor: 'pointer' },
  nextBtn:      { background: '#4f46e5', border: 'none', borderRadius: 8, padding: '10px 24px',
                  color: '#fff', cursor: 'pointer', fontWeight: 600 },
  trainBtn:     { background: '#7c3aed', border: 'none', borderRadius: 8, padding: '10px 28px',
                  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  progressTrack:{ height: 12, background: '#0f172a', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', transition: 'width .4s ease' },
  progressLabel:{ fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  successBox:   { background: '#052e16', border: '1px solid #16a34a', borderRadius: 12, padding: 20, marginTop: 16 },
  openBtn:      { marginTop: 12, background: '#16a34a', border: 'none', borderRadius: 8, padding: '10px 24px',
                  color: '#fff', cursor: 'pointer', fontWeight: 600 },
  jobList:      { display: 'flex', flexDirection: 'column', gap: 8 },
  jobRow:       { display: 'flex', alignItems: 'center', gap: 12, background: '#1e293b',
                  borderRadius: 10, padding: '12px 16px' },
  jobName:      { flex: 1, fontWeight: 500, fontSize: 14, color: '#e2e8f0' },
  badge:        { padding: '2px 10px', borderRadius: 99, fontSize: 11, color: '#fff', fontWeight: 600 },
  miniBar:      { width: 80, height: 6, background: '#0f172a', borderRadius: 99, overflow: 'hidden' },
  miniBarFill:  { height: '100%', background: '#4f46e5' },
  smallBtn:     { background: 'transparent', border: '1px solid #4f46e5', borderRadius: 6, padding: '4px 12px',
                  color: '#818cf8', cursor: 'pointer', fontSize: 12 },
}

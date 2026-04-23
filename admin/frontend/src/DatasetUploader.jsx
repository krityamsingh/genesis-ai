// DatasetUploader.jsx — Upload and manage training datasets
import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { C, F, card, btn, input, th, td, apiHeaders, fmtDate } from './design'

const ACCEPTED = '.jsonl,.json,.csv,.txt,.parquet'

function DropZone({ onFiles, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? C.blue : C.border}`,
        borderRadius: 12,
        padding: '32px 20px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? '#EFF6FF' : C.bgMuted,
        transition: 'all 200ms',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10, color: dragging ? C.blue : C.textMuted }}>⊞</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: dragging ? C.blue : C.textPrimary, marginBottom: 6 }}>
        {dragging ? 'Drop files here' : 'Drop dataset files or click to browse'}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted }}>
        Supported: JSONL, JSON, CSV, TXT, Parquet
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        onChange={e => onFiles(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />
    </div>
  )
}

function FileRow({ file }) {
  const ext = file.name.split('.').pop().toUpperCase()
  const extColors = {
    JSONL: { bg: '#EFF6FF', color: '#1D4ED8' },
    JSON:  { bg: '#EFF6FF', color: '#1D4ED8' },
    CSV:   { bg: '#F0FDF4', color: '#15803D' },
    TXT:   { bg: '#F8FAFC', color: '#64748B' },
    PARQUET: { bg: '#FAF5FF', color: '#7C3AED' },
  }
  const s = extColors[ext] || extColors.TXT
  const size = file.size < 1048576
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / 1048576).toFixed(2)} MB`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', background: C.bgMuted, borderRadius: 8,
    }}>
      <span style={{
        padding: '2px 6px', borderRadius: 4,
        background: s.bg, color: s.color,
        fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}>{ext}</span>
      <span style={{ flex: 1, fontSize: 13, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </span>
      <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.mono, flexShrink: 0 }}>{size}</span>
    </div>
  )
}

export default function DatasetUploader({ token, toast }) {
  const [datasets, setDatasets]   = useState([])
  const [pending,  setPending]    = useState([])  // Files selected for upload
  const [loading,  setLoading]    = useState(true)
  const [uploading,setUploading]  = useState(false)
  const [progress, setProgress]   = useState(0)
  const [domain,   setDomain]     = useState('')
  const [description, setDescription] = useState('')

  const loadDatasets = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/v1/admin/datasets', apiHeaders(token))
        .catch(() => ({ data: [] }))
      setDatasets(Array.isArray(data) ? data : data?.datasets || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadDatasets() }, []) // eslint-disable-line

  const handleFiles = (files) => {
    setPending(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...files.filter(f => !existing.has(f.name))]
    })
  }

  const upload = async () => {
    if (!pending.length) { toast?.('No files selected', 'error'); return }
    setUploading(true); setProgress(0)
    const fd = new FormData()
    pending.forEach(f => fd.append('files', f))
    if (domain)      fd.append('domain', domain)
    if (description) fd.append('description', description)
    try {
      await axios.post('/api/v1/admin/datasets/upload', fd, {
        ...apiHeaders(token),
        headers: { ...apiHeaders(token).headers, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      })
      toast?.(`${pending.length} file(s) uploaded successfully`, 'success')
      setPending([]); setDomain(''); setDescription(''); loadDatasets()
    } catch (e) {
      toast?.(e.response?.data?.detail || 'Upload failed', 'error')
    } finally { setUploading(false); setProgress(0) }
  }

  const deleteDataset = async (id, name) => {
    if (!window.confirm(`Delete dataset "${name}"?`)) return
    try {
      await axios.delete(`/api/v1/admin/datasets/${id}`, apiHeaders(token))
      toast?.(`Dataset "${name}" deleted`, 'success'); loadDatasets()
    } catch { toast?.('Delete failed', 'error') }
  }

  const fmtSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const totalBytes = datasets.reduce((a, d) => a + (d.size_bytes || 0), 0)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 200ms ease' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Datasets', value: datasets.length,          color: C.blue,   icon: '⊞' },
          { label: 'Total Size',     value: fmtSize(totalBytes),      color: C.purple, icon: '◉' },
          { label: 'Ready to Train', value: datasets.filter(d => d.status === 'ready' || !d.status).length, color: C.green, icon: '✓' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ ...card({ padding: '14px 16px' }), display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, color, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload panel */}
      <div style={card({ padding: 20 })}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 14 }}>Upload Dataset</div>

        <DropZone onFiles={handleFiles} disabled={uploading} />

        {pending.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>
              {pending.length} file(s) ready to upload
            </div>
            {pending.map((f, i) => <FileRow key={i} file={f} />)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Domain (optional)
                </label>
                <input
                  placeholder="e.g. medical, legal, code…"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  style={{ ...input(), fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Description (optional)
                </label>
                <input
                  placeholder="Brief description of this dataset"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ ...input(), fontSize: 13 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
              <span>Uploading…</span>
              <span style={{ fontFamily: F.mono }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: C.bgMuted, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: `linear-gradient(90deg, ${C.blue}, #8B5CF6)`,
                borderRadius: 3, transition: 'width 200ms ease',
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={upload}
            disabled={uploading || !pending.length}
            style={{
              ...btn('primary'),
              opacity: uploading || !pending.length ? 0.5 : 1,
              cursor: uploading || !pending.length ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Uploading…</>
              : `⬆ Upload ${pending.length ? `${pending.length} File${pending.length > 1 ? 's' : ''}` : 'Files'}`
            }
          </button>
          {pending.length > 0 && (
            <button onClick={() => setPending([])} style={{ ...btn('default'), fontSize: 13 }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Dataset library */}
      <div style={card()}>
        <div style={{
          padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Dataset Library</span>
          <button onClick={loadDatasets} style={{ ...btn('ghost'), fontSize: 12 }}>↺ Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Name', 'Domain', 'Description', 'Size', 'Format', 'Uploaded', 'Actions'].map(h => (
                <th key={h} style={th()}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ ...td(), textAlign: 'center', padding: 24, color: C.textMuted }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
                  Loading datasets…
                </td></tr>
              )}
              {!loading && datasets.length === 0 && (
                <tr><td colSpan={7} style={{ ...td(), textAlign: 'center', padding: 24, color: C.textMuted }}>
                  No datasets uploaded yet. Use the upload panel above to add files.
                </td></tr>
              )}
              {datasets.map(d => {
                const ext = (d.filename || d.name || '').split('.').pop().toUpperCase()
                const extColors = {
                  JSONL: { bg: '#EFF6FF', color: '#1D4ED8' },
                  JSON:  { bg: '#EFF6FF', color: '#1D4ED8' },
                  CSV:   { bg: '#F0FDF4', color: '#15803D' },
                  PARQUET: { bg: '#FAF5FF', color: '#7C3AED' },
                }
                const s = extColors[ext] || { bg: C.bgMuted, color: C.textSecondary }
                return (
                  <tr key={d.id || d._id}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 100ms' }}
                  >
                    <td style={{ ...td(), maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.filename || d.name || '—'}
                      </div>
                      {d.row_count != null && (
                        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: F.mono }}>{d.row_count.toLocaleString()} rows</div>
                      )}
                    </td>
                    <td style={{ ...td(), fontSize: 12 }}>
                      {d.domain
                        ? <span style={{ background: C.blueLight, color: C.blue, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{d.domain}</span>
                        : <span style={{ color: C.textMuted }}>—</span>
                      }
                    </td>
                    <td style={{ ...td(), fontSize: 12, color: C.textSecondary, maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.description || '—'}
                      </div>
                    </td>
                    <td style={{ ...td(), fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                      {fmtSize(d.size_bytes)}
                    </td>
                    <td style={td()}>
                      <span style={{ ...s, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{ext || '?'}</span>
                    </td>
                    <td style={{ ...td(), fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                      {fmtDate(d.created_at || d.uploaded_at)}
                    </td>
                    <td style={td()}>
                      <button
                        onClick={() => deleteDataset(d.id || d._id, d.filename || d.name)}
                        style={{ ...btn('danger'), padding: '3px 10px', fontSize: 11 }}
                      >Delete</button>
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

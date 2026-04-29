// BackupManager.jsx — Backup creation, listing, and restore
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { C, F, card, btn, input, th, td, apiHeaders, fmtDate } from './design'

function BackupStatusBadge({ status }) {
  const map = {
    complete: { bg: C.greenLight,  color: '#065F46', icon: '✓' },
    running:  { bg: C.blueLight,   color: '#1D4ED8', icon: '⟳' },
    failed:   { bg: C.redLight,    color: '#991B1B', icon: '✕' },
    pending:  { bg: C.amberLight,  color: '#92400E', icon: '⏳' },
  }
  const s = map[status] || map.complete
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ animation: status === 'running' ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>
        {s.icon}
      </span>
      {status}
    </span>
  )
}

export default function BackupManager({ token, toast }) {
  const [backups,  setBackups]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring,setRestoring]= useState(null)
  const [lastBk,   setLastBk]   = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/v1/admin/backups', apiHeaders(token))
      const list = Array.isArray(data) ? data : data?.backups || []
      setBackups(list)
      if (list.length > 0) setLastBk(list[0])
    } catch { toast?.('Failed to load backups', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const create = async () => {
    setCreating(true)
    try {
      const { data } = await axios.post('/api/v1/admin/backup', {}, apiHeaders(token))
      toast?.(`Backup ${data.backup_id || 'created'} successfully`, 'success')
      load()
    } catch (e) {
      toast?.(e.response?.data?.detail || 'Backup failed', 'error')
    } finally { setCreating(false) }
  }

  const restore = async (id) => {
    if (!window.confirm(`Restore backup "${id}"?\n\nThis will overwrite current data. This cannot be undone.`)) return
    setRestoring(id)
    try {
      await axios.post(`/api/v1/admin/backups/${id}/restore`, {}, apiHeaders(token))
      toast?.('Restore completed — restart recommended', 'success')
    } catch { toast?.('Restore failed', 'error') }
    finally { setRestoring(null) }
  }

  const fmtSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 200ms ease' }}>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Backups', value: backups.length, icon: '◎', color: C.blue },
          { label: 'Latest Backup', value: lastBk ? fmtDate(lastBk.created_at).split(',')[0] : '—', icon: '⟳', color: C.green },
          { label: 'Total Size',    value: fmtSize(backups.reduce((a, b) => a + (b.size_bytes || 0), 0)), icon: '⊞', color: C.purple },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ ...card({ padding: '14px 16px' }), display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, color, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{
        ...card({ padding: '16px 20px' }),
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>Create New Backup</div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3 }}>
            Backs up MongoDB collections, prompt logs, module states, and conversation history.
          </div>
        </div>
        <button
          onClick={create} disabled={creating}
          style={{
            ...btn('primary'),
            opacity: creating ? 0.7 : 1,
            cursor: creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating
            ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Creating backup…</>
            : '◎ Create Backup Now'
          }
        </button>
        <button onClick={load} style={{ ...btn('default'), fontSize: 13 }}>↺ Refresh</button>
      </div>

      {/* Warning */}
      <div style={{
        ...card({ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A' }),
        fontSize: 12, color: '#78350F', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <span style={{ flexShrink: 0 }}>⚠</span>
        Restoring a backup will overwrite all current data. Always create a fresh backup before restoring an older one.
      </div>

      {/* Backup list */}
      <div style={card()}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Backup History</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Backup ID', 'Created', 'Size', 'Collections', 'Status', 'Actions'].map(h => (
                <th key={h} style={th()}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ ...td(), textAlign: 'center', padding: 24, color: C.textMuted }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
                  Loading backups…
                </td></tr>
              )}
              {!loading && backups.length === 0 && (
                <tr><td colSpan={6} style={{ ...td(), textAlign: 'center', padding: 24, color: C.textMuted }}>
                  No backups found. Create your first backup above.
                </td></tr>
              )}
              {backups.map((b, i) => (
                <tr key={b.id || b.backup_id || i}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 100ms' }}
                >
                  <td style={{ ...td(), fontFamily: F.mono, fontSize: 12 }}>
                    {(b.id || b.backup_id || '').toString().slice(0, 20)}
                  </td>
                  <td style={{ ...td(), fontSize: 12, whiteSpace: 'nowrap' }}>
                    {fmtDate(b.created_at)}
                  </td>
                  <td style={{ ...td(), fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                    {fmtSize(b.size_bytes)}
                  </td>
                  <td style={{ ...td(), fontSize: 12, color: C.textSecondary }}>
                    {Array.isArray(b.collections) ? b.collections.join(', ') : b.collections || '—'}
                  </td>
                  <td style={td()}>
                    <BackupStatusBadge status={b.status || 'complete'} />
                  </td>
                  <td style={td()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {b.download_url && (
                        <a
                          href={b.download_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            ...btn('default'),
                            padding: '4px 10px', fontSize: 11,
                            textDecoration: 'none', display: 'inline-flex',
                          }}
                        >⬇ Download</a>
                      )}
                      <button
                        onClick={() => restore(b.id || b.backup_id)}
                        disabled={restoring === (b.id || b.backup_id)}
                        style={{
                          ...btn('danger'), padding: '4px 10px', fontSize: 11,
                          opacity: restoring === (b.id || b.backup_id) ? 0.6 : 1,
                        }}
                      >
                        {restoring === (b.id || b.backup_id) ? '⟳ Restoring…' : '↺ Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

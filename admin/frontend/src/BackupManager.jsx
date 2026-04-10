import React, { useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

export default function BackupManager({ token }) {
  const [backups,  setBackups]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')

  const trigger = async () => {
    setLoading(true); setMsg('')
    try {
      const { data } = await axios.post('/api/v1/admin/backup', null, api(token))
      const entry = {
        path: data.backup_path,
        time: new Date().toLocaleString(),
        id:   Date.now(),
      }
      setBackups(prev => [entry, ...prev])
      setMsg('✓ Backup created: ' + data.backup_path)
    } catch (e) {
      setMsg('⚠ ' + (e.response?.data?.detail || 'Backup failed'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Info card */}
      <div style={{
        background: 'rgba(0,245,255,0.03)',
        border: '1px solid rgba(0,245,255,0.12)',
        borderRadius: 4, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            Knowledge Graph Backup
          </div>
          <div style={{ fontSize: 11, color: '#4a6080', lineHeight: 1.6 }}>
            Exports a snapshot of the entire KG to disk.<br/>
            Backups are stored in the configured export directory.
          </div>
        </div>
        <button onClick={trigger} disabled={loading} style={{
          background: loading ? 'rgba(0,245,255,0.04)' : 'rgba(0,245,255,0.1)',
          border: '1px solid rgba(0,245,255,0.3)',
          borderRadius: 3, color: '#00f5ff', fontSize: 11, fontWeight: 700,
          padding: '12px 28px', cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: 2, fontFamily: 'inherit', transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}>
          {loading ? '⊞ BACKING UP…' : '⊞ CREATE BACKUP'}
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 3, fontSize: 12,
          background: msg.startsWith('✓') ? 'rgba(0,255,150,0.06)' : 'rgba(255,80,80,0.06)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(0,255,150,0.2)' : 'rgba(255,80,80,0.2)'}`,
          color: msg.startsWith('✓') ? '#00ff96' : '#ff6060',
          fontFamily: 'inherit',
        }}>{msg}</div>
      )}

      {/* Backup history (session only) */}
      {backups.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 20px', borderBottom: '1px solid rgba(0,245,255,0.06)',
            fontSize: 10, color: '#4a6080', letterSpacing: 2,
          }}>SESSION BACKUPS</div>
          {backups.map(b => (
            <div key={b.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.04)',
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#e0f0ff', fontFamily: "'JetBrains Mono',monospace" }}>
                  {b.path}
                </div>
                <div style={{ fontSize: 10, color: '#3d5a72', marginTop: 2 }}>{b.time}</div>
              </div>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
                background: 'rgba(0,255,150,0.08)', border: '1px solid rgba(0,255,150,0.2)',
                color: '#00ff96',
              }}>COMPLETE</span>
            </div>
          ))}
        </div>
      )}

      {backups.length === 0 && !msg && (
        <div style={{
          padding: 28, textAlign: 'center',
          color: '#3d5a72', fontSize: 12, borderRadius: 4,
          border: '1px dashed rgba(0,245,255,0.08)',
        }}>
          No backups created this session. Trigger one above.
        </div>
      )}
    </div>
  )
}

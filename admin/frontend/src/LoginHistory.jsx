// admin/frontend/src/LoginHistory.jsx — NEW FILE
// Admin tab: all login sessions across all users.
// Columns: name, email/phone, method badge, IP, login time, duration, status.
// Filter by method and date. Export CSV.

import { useState, useEffect } from 'react'

const ADMIN_API = '/api/admin'

function MethodBadge({ method }) {
  const styles = {
    google:   { background: '#DBEAFE', color: '#1D4ED8' },
    otp:      { background: '#D1FAE5', color: '#065F46' },
    password: { background: '#F3F4F6', color: '#374151' },
  }
  const s = styles[method] || styles.password
  return (
    <span style={{
      ...s, borderRadius: 99, padding: '2px 8px',
      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
    }}>
      {method === 'google' ? '🌐 Google' : method === 'otp' ? '📱 OTP' : '🔑 Password'}
    </span>
  )
}

function StatusDot({ active }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: active ? '#10B981' : '#9CA3AF',
      marginRight: 6,
    }} />
  )
}

export default function LoginHistory({ token }) {
  const [sessions,   setSessions]   = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [method,     setMethod]     = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [offset,     setOffset]     = useState(0)
  const [error,      setError]      = useState('')
  const limit = 50

  const fetchSessions = async (off = 0) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit, offset: off })
      if (method)   params.set('method', method)
      if (dateFrom) params.set('date_from', dateFrom)

      const res = await fetch(`/api/v1/admin/login-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setError('Failed to load login history.'); return }
      const data = await res.json()
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
      setOffset(off)
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSessions(0) }, [method, dateFrom]) // eslint-disable-line

  const exportCsv = () => {
    const params = new URLSearchParams()
    if (method) params.set('method', method)
    window.open(`/api/v1/admin/login-history/export?${params}&token=${token}`, '_blank')
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Login History</h2>
        <div style={{ flex: 1 }} />

        {/* Filters */}
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
        >
          <option value="">All methods</option>
          <option value="google">Google</option>
          <option value="otp">OTP</option>
          <option value="password">Password</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
        />

        <button
          onClick={exportCsv}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >⬇ Export CSV</button>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
        {total} total sessions
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E5E7EB' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9F9F9', borderBottom: '1px solid #E5E7EB' }}>
              {['User', 'Method', 'IP Address', 'Login Time', 'Duration', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>Loading…</td></tr>
            )}
            {!loading && sessions.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>No sessions found.</td></tr>
            )}
            {sessions.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 500 }}>{s.user_name || '—'}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.user_email || ''}</div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <MethodBadge method={s.login_method} />
                </td>
                <td style={{ padding: '10px 14px', color: '#6B7280', fontFamily: 'monospace', fontSize: 12 }}>
                  {s.ip_address || '—'}
                </td>
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#374151' }}>
                  {s.logged_in_at ? new Date(s.logged_in_at).toLocaleString() : '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#6B7280' }}>
                  {s.duration || '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <StatusDot active={s.is_active} />
                  <span style={{ color: s.is_active ? '#065F46' : '#6B7280' }}>
                    {s.is_active ? 'Active' : 'Ended'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            disabled={offset === 0}
            onClick={() => fetchSessions(Math.max(0, offset - limit))}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: '#6B7280' }}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            disabled={offset + limit >= total}
            onClick={() => fetchSessions(offset + limit)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: offset + limit >= total ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >Next →</button>
        </div>
      )}
    </div>
  )
}

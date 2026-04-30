// LoginHistory.jsx — All login sessions with filters, pagination, CSV export
import React, { useState, useEffect } from 'react'
import { C, F, card, btn, input, th, td, apiHeaders, fmtDate, fmtDuration } from './design'

const LIMIT = 50

function MethodBadge({ method }) {
  const map = {
    google:   { bg: '#EFF6FF', color: '#1D4ED8', icon: '🌐', label: 'Google' },
    otp:      { bg: '#F0FDF4', color: '#15803D', icon: '📱', label: 'OTP' },
    password: { bg: '#F8FAFC', color: '#64748B', icon: '🔑', label: 'Password' },
  }
  const s = map[method] || map.password
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, border: `1px solid ${s.color}30`,
    }}>
      {s.icon} {s.label}
    </span>
  )
}

export default function LoginHistory({ token, toast }) {
  const [sessions, setSessions] = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [method,   setMethod]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [userQ,    setUserQ]    = useState('')
  const [offset,   setOffset]   = useState(0)

  const fetch = async (off = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: off })
      if (method)   params.set('method', method)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo)   params.set('date_to', dateTo)
      if (userQ)    params.set('user_query', userQ)
      const res = await window.fetch(`/api/v1/admin/login-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setSessions(data.sessions || data.items || [])
      setTotal(data.total || data.count || 0)
      setOffset(off)
    } catch { toast?.('Failed to load login history', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch(0) }, [method, dateFrom, dateTo]) // eslint-disable-line

  const exportCsv = () => {
    const params = new URLSearchParams()
    if (method)   params.set('method', method)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo)   params.set('date_to', dateTo)
    window.open(`/api/v1/admin/login-history/export?${params}&token=${token}`, '_blank')
  }

  const activeSessions = sessions.filter(s => s.is_active).length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 200ms ease' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Sessions', value: total, color: C.blue, icon: '◇' },
          { label: 'Active Now',     value: activeSessions, color: C.green, icon: '●' },
          { label: 'Google OAuth',   value: sessions.filter(s => s.login_method === 'google').length, color: '#1D4ED8', icon: '🌐' },
          { label: 'OTP Sessions',   value: sessions.filter(s => s.login_method === 'otp').length, color: '#15803D', icon: '📱' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ ...card({ padding: '14px 16px' }), display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        ...card({ padding: '14px 16px' }),
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>User search</label>
          <input
            placeholder="Name or email…"
            value={userQ}
            onChange={e => setUserQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetch(0)}
            style={{ ...input(), fontSize: 13 }}
          />
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Method</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            style={{ ...input(), fontSize: 13, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="">All methods</option>
            <option value="google">Google OAuth</option>
            <option value="otp">OTP / Phone</option>
            <option value="password">Password</option>
          </select>
        </div>
        <div style={{ flex: '0 1 155px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>From date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...input(), fontSize: 13 }} />
        </div>
        <div style={{ flex: '0 1 155px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>To date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ ...input(), fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          <button onClick={() => fetch(0)} style={{ ...btn('primary'), fontSize: 13 }}>Search</button>
          <button onClick={() => { setMethod(''); setDateFrom(''); setDateTo(''); setUserQ(''); }} style={{ ...btn('default'), fontSize: 13 }}>Clear</button>
          <button onClick={exportCsv} style={{ ...btn('default'), fontSize: 13 }}>⬇ CSV</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card(), overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead>
            <tr>
              {['User', 'Method', 'IP Address', 'Device', 'Login Time', 'Duration', 'Status'].map(h => (
                <th key={h} style={th()}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ ...td(), textAlign: 'center', padding: 32, color: C.textMuted }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
                Loading sessions…
              </td></tr>
            )}
            {!loading && sessions.length === 0 && (
              <tr><td colSpan={7} style={{ ...td(), textAlign: 'center', padding: 32, color: C.textMuted }}>
                No sessions match your filters.
              </td></tr>
            )}
            {sessions.map((s, i) => (
              <tr key={s.id || s._id || i}
                style={{ transition: 'background 100ms' }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={td()}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.user_name || '—'}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{s.user_email || s.user_phone || ''}</div>
                </td>
                <td style={td()}><MethodBadge method={s.login_method} /></td>
                <td style={{ ...td(), fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>
                  {s.ip_address || '—'}
                </td>
                <td style={{ ...td(), maxWidth: 180 }}>
                  <div style={{ fontSize: 11, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.user_agent
                      ? s.user_agent.replace(/Mozilla\/[\d.]+ /i, '').substring(0, 60) + (s.user_agent.length > 60 ? '…' : '')
                      : '—'}
                  </div>
                </td>
                <td style={{ ...td(), whiteSpace: 'nowrap', fontSize: 12 }}>
                  {fmtDate(s.logged_in_at)}
                </td>
                <td style={{ ...td(), fontSize: 12, color: C.textSecondary, fontFamily: F.mono }}>
                  {fmtDuration(s.logged_in_at, s.logged_out_at)}
                </td>
                <td style={td()}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: s.is_active ? C.green : '#CBD5E1',
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: s.is_active ? '#065F46' : C.textMuted }}>
                      {s.is_active ? 'Active' : 'Ended'}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>
            {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </span>
          <button
            disabled={offset === 0}
            onClick={() => fetch(Math.max(0, offset - LIMIT))}
            style={{ ...btn('default'), fontSize: 12, padding: '5px 12px', opacity: offset === 0 ? 0.4 : 1 }}
          >← Prev</button>
          <button
            disabled={offset + LIMIT >= total}
            onClick={() => fetch(offset + LIMIT)}
            style={{ ...btn('default'), fontSize: 12, padding: '5px 12px', opacity: offset + LIMIT >= total ? 0.4 : 1 }}
          >Next →</button>
        </div>
      )}
    </div>
  )
}

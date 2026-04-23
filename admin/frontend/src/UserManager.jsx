// UserManager.jsx — Full user CRUD with MongoDB fields
import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { C, F, card, btn, input, th, td, apiHeaders, fmtDate } from './design'

const BLANK = { username: '', email: '', password: '', is_admin: false }

function Avatar({ user }) {
  const initials = (user.display_name || user.username || '?').substring(0, 2).toUpperCase()
  const hue = [...(user.username || 'a')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: user.avatar_url ? 'transparent' : `hsl(${hue}, 60%, 70%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#fff',
      overflow: 'hidden',
    }}>
      {user.avatar_url
        ? <img src={user.avatar_url} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}

export default function UserManager({ token, toast }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(BLANK)
  const [busy,    setBusy]    = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all') // all | admin | active | inactive
  const searchRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/v1/admin/users', apiHeaders(token))
      setUsers(Array.isArray(data) ? data : [])
    } catch { toast?.('Failed to load users', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const createUser = async () => {
    if (!form.username || !form.email || !form.password) {
      toast?.('All fields are required', 'error'); return
    }
    setBusy(true)
    try {
      await axios.post('/api/v1/admin/users', form, apiHeaders(token))
      toast?.(`User ${form.username} created`, 'success')
      setForm(BLANK); setShowAdd(false); load()
    } catch (e) {
      toast?.(e.response?.data?.detail || 'Failed to create user', 'error')
    } finally { setBusy(false) }
  }

  const deactivate = async (id, uname) => {
    if (!window.confirm(`Ban user "${uname}"? They will lose access.`)) return
    try {
      await axios.delete(`/api/v1/admin/users/${id}`, apiHeaders(token))
      toast?.(`${uname} banned`, 'success'); load()
    } catch { toast?.('Failed to ban user', 'error') }
  }

  const promote = async (id, uname) => {
    try {
      await axios.post(`/api/v1/admin/users/${id}/promote`, {}, apiHeaders(token))
      toast?.(`${uname} promoted to admin`, 'success'); load()
    } catch { toast?.('Failed to promote', 'error') }
  }

  const demote = async (id, uname) => {
    if (!window.confirm(`Remove admin rights from "${uname}"?`)) return
    try {
      await axios.post(`/api/v1/admin/users/${id}/demote`, {}, apiHeaders(token))
      toast?.(`${uname} demoted`, 'success'); load()
    } catch { toast?.('Failed to demote', 'error') }
  }

  // Filtered & searched users
  const visible = users
    .filter(u => {
      if (filter === 'admin')    return u.is_admin
      if (filter === 'active')   return u.is_active
      if (filter === 'inactive') return !u.is_active
      return true
    })
    .filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return (u.username || '').toLowerCase().includes(q)
          || (u.email || '').toLowerCase().includes(q)
          || (u.display_name || '').toLowerCase().includes(q)
    })

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 200ms ease' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none' }}>⌕</span>
          <input
            ref={searchRef}
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              ...input(),
              paddingLeft: 30, paddingRight: search ? 30 : 12,
              fontSize: 13,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 13,
            }}>✕</button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, background: C.bgMuted, borderRadius: 8, padding: 3 }}>
          {[['all', 'All'], ['admin', 'Admins'], ['active', 'Active'], ['inactive', 'Banned']].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: filter === k ? C.bgCard : 'transparent',
              color: filter === k ? C.textPrimary : C.textSecondary,
              fontSize: 12, fontWeight: filter === k ? 600 : 400,
              cursor: 'pointer',
              boxShadow: filter === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={load} style={{ ...btn('ghost'), fontSize: 13, color: C.textMuted }}>↺ Refresh</button>
        <button onClick={() => setShowAdd(s => !s)} style={{
          ...btn(showAdd ? 'default' : 'primary'),
          fontSize: 13,
        }}>
          {showAdd ? '✕ Cancel' : '+ New User'}
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div style={{
          ...card({ padding: 20, background: '#F0F7FF', border: `1px solid #BFDBFE` }),
          animation: 'fadeIn 150ms ease',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 14 }}>Create New User</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { k: 'username', label: 'Username', type: 'text', ph: 'johndoe' },
              { k: 'email',    label: 'Email',    type: 'email', ph: 'john@example.com' },
              { k: 'password', label: 'Password', type: 'password', ph: '••••••••' },
            ].map(({ k, label, type, ph }) => (
              <div key={k}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </label>
                <input
                  type={type} placeholder={ph}
                  value={form[k]}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ ...input(), fontSize: 13, border: `1px solid #BFDBFE` }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={form.is_admin}
                onChange={e => setForm(p => ({ ...p, is_admin: e.target.checked }))}
                style={{ width: 15, height: 15 }} />
              <span style={{ fontWeight: 500, color: C.textPrimary }}>Grant admin rights</span>
            </label>
            <div style={{ flex: 1 }} />
            <button
              disabled={busy || !form.username || !form.email || !form.password}
              onClick={createUser}
              style={{
                ...btn('primary'),
                opacity: busy || !form.username || !form.email || !form.password ? 0.65 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Creating…</> : 'Create User'}
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: C.textSecondary, alignItems: 'center' }}>
        <span>{visible.length} of {users.length} users</span>
        {search && <span>· filtered by "{search}"</span>}
        <span style={{ marginLeft: 'auto' }}>
          {users.filter(u => u.is_active).length} active · {users.filter(u => u.is_admin).length} admins
        </span>
      </div>

      {/* Table */}
      <div style={{ ...card(), overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {['User', 'Contact', 'Auth', 'Role', 'Status', 'Sessions', 'Last Login', 'Actions'].map(h => (
                <th key={h} style={th()}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ ...td(), textAlign: 'center', color: C.textMuted, padding: 32 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
                Loading users…
              </td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={8} style={{ ...td(), textAlign: 'center', color: C.textMuted, padding: 32 }}>
                {search ? `No users match "${search}"` : 'No users found.'}
              </td></tr>
            )}
            {visible.map(u => (
              <tr key={u.id || u._id} style={{ transition: 'background 100ms' }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* User */}
                <td style={td()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar user={u} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                      {u.display_name && (
                        <div style={{ fontSize: 11, color: C.textMuted }}>{u.display_name}</div>
                      )}
                      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F.mono }}>
                        {(u.id || u._id || '').toString().slice(0, 12)}…
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td style={td()}>
                  <div style={{ fontSize: 12 }}>{u.email || <span style={{ color: C.textMuted }}>—</span>}</div>
                  {u.phone && <div style={{ fontSize: 11, color: C.textSecondary }}>{u.phone}</div>}
                </td>

                {/* Auth methods */}
                <td style={td()}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.google_id && (
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>
                        🌐 Google
                      </span>
                    )}
                    {u.phone && (
                      <span style={{ background: C.greenLight, color: '#065F46', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>
                        📱 OTP
                      </span>
                    )}
                    {!u.google_id && !u.phone && (
                      <span style={{ background: '#F3F4F6', color: C.textSecondary, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>
                        🔑 Password
                      </span>
                    )}
                  </div>
                </td>

                {/* Role */}
                <td style={{ ...td(), textAlign: 'center' }}>
                  {u.is_admin
                    ? <span style={{ background: C.amberLight, color: '#92400E', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Admin</span>
                    : <span style={{ color: C.textMuted, fontSize: 12 }}>User</span>
                  }
                </td>

                {/* Status */}
                <td style={{ ...td(), textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? C.green : C.red, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: u.is_active ? '#065F46' : '#991B1B', fontWeight: 500 }}>
                      {u.is_active ? 'Active' : 'Banned'}
                    </span>
                  </span>
                </td>

                {/* Sessions */}
                <td style={{ ...td(), textAlign: 'center', color: C.textSecondary, fontFamily: F.mono, fontSize: 13 }}>
                  {u.session_count ?? 0}
                </td>

                {/* Last login */}
                <td style={{ ...td(), fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                  {u.last_login ? fmtDate(u.last_login) : '—'}
                </td>

                {/* Actions */}
                <td style={td()}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {u.is_admin
                      ? <button onClick={() => demote(u.id || u._id, u.username)}
                          style={{ ...btn('default'), padding: '4px 10px', fontSize: 11 }}>
                          Demote
                        </button>
                      : <button onClick={() => promote(u.id || u._id, u.username)}
                          style={{ background: C.blueLight, color: C.blue, border: `1px solid #BFDBFE`, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Promote
                        </button>
                    }
                    {u.is_active && (
                      <button onClick={() => deactivate(u.id || u._id, u.username)}
                        style={{ ...btn('danger'), padding: '4px 10px', fontSize: 11 }}>
                        Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
        {users.length} total users · {users.filter(u => u.is_active).length} active · {users.filter(u => u.is_admin).length} admins
      </div>
    </div>
  )
}

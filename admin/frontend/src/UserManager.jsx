// admin/frontend/src/UserManager.jsx — UPDATED (MongoDB fields + promote/demote + ban)
// New columns: display_name, phone, google_id, session_count, last_login.
// New actions: Promote/Demote admin, Ban/Unban user.
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })
const BLANK = { username: '', email: '', password: '', is_admin: false }

const cell = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #F3F4F6' }
const th   = { ...cell, fontWeight: 600, color: '#374151', background: '#F9F9F9', whiteSpace: 'nowrap' }

export default function UserManager({ token }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(BLANK)
  const [adding,  setAdding]  = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [msg,     setMsg]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/v1/admin/users', api(token))
      setUsers(Array.isArray(data) ? data : [])
    } catch { setMsg('Failed to load users.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const createUser = async () => {
    setAdding(true); setMsg('')
    try {
      await axios.post('/api/v1/admin/users', form, api(token))
      setMsg('User created.'); setForm(BLANK); setShowAdd(false)
      load()
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Failed to create user.')
    } finally { setAdding(false) }
  }

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return
    try { await axios.delete(`/api/v1/admin/users/${id}`, api(token)); load() }
    catch { setMsg('Failed to deactivate.') }
  }

  const promote = async (id) => {
    try { await axios.post(`/api/v1/admin/users/${id}/promote`, {}, api(token)); load() }
    catch { setMsg('Failed to promote.') }
  }

  const demote = async (id) => {
    if (!window.confirm('Remove admin rights from this user?')) return
    try { await axios.post(`/api/v1/admin/users/${id}/demote`, {}, api(token)); load() }
    catch { setMsg('Failed to demote.') }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Users</h2>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowAdd(s => !s)}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: showAdd ? '#F3F4F6' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          {showAdd ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith('Failed') ? '#FEE2E2' : '#D1FAE5',
          color: msg.startsWith('Failed') ? '#991B1B' : '#065F46',
          borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
        }}>{msg}</div>
      )}

      {/* Add user form */}
      {showAdd && (
        <div style={{ background: '#F9F9F9', border: '1px solid #E5E7EB', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>New User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {['username', 'email', 'password'].map(f => (
              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                type={f === 'password' ? 'password' : 'text'}
                value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
              />
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_admin}
                onChange={e => setForm(p => ({ ...p, is_admin: e.target.checked }))} />
              Admin
            </label>
          </div>
          <button
            disabled={adding || !form.username || !form.email || !form.password}
            onClick={createUser}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.7 : 1,
            }}
          >
            {adding ? 'Creating…' : 'Create User'}
          </button>
        </div>
      )}

      {/* Users table */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              {['Username', 'Display Name', 'Email / Phone', 'Google', 'Admin', 'Active', 'Sessions', 'Last Login', 'Actions'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ ...cell, textAlign: 'center', color: '#9CA3AF' }}>Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={9} style={{ ...cell, textAlign: 'center', color: '#9CA3AF' }}>No users found.</td></tr>
            )}
            {users.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={cell}>
                  <div style={{ fontWeight: 500 }}>{u.username}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, fontFamily: 'monospace' }}>
                    {u.id?.slice(0, 12)}…
                  </div>
                </td>
                <td style={cell}>{u.display_name || <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                <td style={cell}>
                  <div>{u.email || <span style={{ color: '#D1D5DB' }}>—</span>}</div>
                  {u.phone && <div style={{ fontSize: 11, color: '#6B7280' }}>{u.phone}</div>}
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  {u.google_id
                    ? <span style={{ background: '#DBEAFE', color: '#1D4ED8', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>✓</span>
                    : <span style={{ color: '#D1D5DB' }}>—</span>
                  }
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  {u.is_admin
                    ? <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>Admin</span>
                    : <span style={{ color: '#D1D5DB' }}>—</span>
                  }
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: u.is_active ? '#10B981' : '#EF4444',
                  }} />
                </td>
                <td style={{ ...cell, textAlign: 'center', color: '#6B7280' }}>{u.session_count ?? 0}</td>
                <td style={{ ...cell, fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}
                </td>
                <td style={{ ...cell }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {u.is_admin
                      ? <button onClick={() => demote(u.id)} style={btnStyle('#FEE2E2', '#991B1B')}>Demote</button>
                      : <button onClick={() => promote(u.id)} style={btnStyle('#DBEAFE', '#1D4ED8')}>Promote</button>
                    }
                    {u.is_active && (
                      <button onClick={() => deactivate(u.id)} style={btnStyle('#F3F4F6', '#374151')}>Ban</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF' }}>
        {users.length} user{users.length !== 1 ? 's' : ''} total
      </div>
    </div>
  )
}

function btnStyle(bg, color) {
  return {
    padding: '4px 10px', borderRadius: 6, border: 'none',
    background: bg, color, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

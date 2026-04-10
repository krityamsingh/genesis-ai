import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const BLANK = { username: '', email: '', password: '', is_admin: false }

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
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  const createUser = async (e) => {
    e.preventDefault()
    setAdding(true); setMsg('')
    try {
      await axios.post('/api/v1/admin/users', form, api(token))
      setMsg('✓ User created')
      setForm(BLANK); setShowAdd(false)
      load()
    } catch(e) {
      setMsg('⚠ ' + (e.response?.data?.detail || 'Failed'))
    } finally { setAdding(false) }
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await axios.delete(`/api/v1/admin/users/${id}`, api(token))
      load()
    } catch(e) { console.error(e) }
  }

  const inp = (ph, field, type='text') => (
    <input
      type={type} placeholder={ph} value={form[field]}
      onChange={e => setForm(p => ({ ...p, [field]: type === 'checkbox' ? e.target.checked : e.target.value }))}
      style={{
        background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
        borderRadius: 3, padding: '8px 12px', color: '#e0f0ff', fontSize: 12,
        fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
      }}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#4a6080', letterSpacing: 2 }}>
          {users.length} REGISTERED USERS
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)',
          borderRadius: 3, color: '#00f5ff', fontSize: 10, padding: '6px 14px',
          cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit',
        }}>
          {showAdd ? '✕ CANCEL' : '+ ADD USER'}
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '8px 14px', borderRadius: 3, fontSize: 12,
          background: msg.startsWith('✓') ? 'rgba(0,255,150,0.06)' : 'rgba(255,80,80,0.06)',
          border: `1px solid ${msg.startsWith('✓') ? 'rgba(0,255,150,0.2)' : 'rgba(255,80,80,0.2)'}`,
          color: msg.startsWith('✓') ? '#00ff96' : '#ff6060',
        }}>{msg}</div>
      )}

      {/* Add user form */}
      {showAdd && (
        <form onSubmit={createUser} style={{
          background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.12)',
          borderRadius: 4, padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 10, color: '#00f5ff', letterSpacing: 2, marginBottom: 4 }}>CREATE USER</div>
          {inp('Username', 'username')}
          {inp('Email', 'email', 'email')}
          {inp('Password', 'password', 'password')}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8ab0cc', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_admin}
              onChange={e => setForm(p => ({ ...p, is_admin: e.target.checked }))}/>
            Admin privileges
          </label>
          <button type="submit" disabled={adding} style={{
            marginTop: 4,
            background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: 3, color: '#00f5ff', fontSize: 11, padding: '9px 0',
            cursor: adding ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: 1,
          }}>
            {adding ? 'CREATING…' : 'CREATE USER →'}
          </button>
        </form>
      )}

      {/* User list */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 60px',
          padding: '10px 20px', borderBottom: '1px solid rgba(0,245,255,0.08)',
          fontSize: 9, color: '#2a4a60', letterSpacing: 2 }}>
          <span>USERNAME</span><span>EMAIL</span><span>ROLE</span><span>STATUS</span><span/>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: '#4a6080', fontSize: 12 }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 20, color: '#3d5a72', fontSize: 12 }}>No users found.</div>
        ) : users.map(u => (
          <div key={u.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 60px',
            padding: '12px 20px', borderBottom: '1px solid rgba(0,245,255,0.04)',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: '#e0f0ff', fontWeight: 600 }}>{u.username}</span>
            <span style={{ fontSize: 11, color: '#4a6080' }}>{u.email}</span>
            <span style={{
              fontSize: 9, letterSpacing: 1, padding: '2px 6px', borderRadius: 2,
              background: u.is_admin ? 'rgba(255,180,0,0.1)' : 'rgba(0,245,255,0.06)',
              border: `1px solid ${u.is_admin ? 'rgba(255,180,0,0.25)' : 'rgba(0,245,255,0.12)'}`,
              color: u.is_admin ? '#ffb400' : '#00f5ff',
              width: 'fit-content',
            }}>
              {u.is_admin ? 'ADMIN' : 'USER'}
            </span>
            <span style={{
              fontSize: 9, letterSpacing: 1,
              color: u.is_active ? '#00ff96' : '#ff6060',
            }}>
              {u.is_active ? '● ACTIVE' : '○ INACTIVE'}
            </span>
            {u.is_active && (
              <button onClick={() => deactivate(u.id)} style={{
                background: 'none', border: '1px solid rgba(255,60,60,0.2)',
                borderRadius: 2, color: '#ff6060', fontSize: 9,
                padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
              }}>DEACTIVATE</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

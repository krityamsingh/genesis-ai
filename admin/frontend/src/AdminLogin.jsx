// admin/frontend/src/AdminLogin.jsx — RESTYLED (Claude.ai white design)
// Replaces dark neon login with clean white card matching main frontend.
import React, { useState } from 'react'
import axios from 'axios'

const ADMIN_API = import.meta.env.VITE_ADMIN_API_URL || '/api/admin'
const TOKEN_KEY = 'genesis_admin_token'

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await axios.post(
        `${ADMIN_API}/login`,
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      )
      sessionStorage.setItem(TOKEN_KEY, data.token || data.access_token)
      onLogin(data.token || data.access_token)
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 429) setError('Too many attempts. Wait 60 seconds.')
      else if (status === 401) setError('Invalid admin credentials.')
      else setError(detail || 'Login failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F4F4F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        width: '100%', maxWidth: 400, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#1A1A1A', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, marginBottom: 14,
          }}>G</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
            Genesis Admin
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Sign in to your admin account
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2', color: '#991B1B',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, marginBottom: 20,
          }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6, color: '#374151' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="admin"
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: '1px solid #E5E7EB', borderRadius: 10,
                background: '#fff', color: '#1A1A1A', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6, color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: '1px solid #E5E7EB', borderRadius: 10,
                background: '#fff', color: '#1A1A1A', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px 20px',
              background: loading ? '#93C5FD' : '#2563EB',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 24 }}>
          Admin access only · Genesis AI
        </p>
      </div>
    </div>
  )
}

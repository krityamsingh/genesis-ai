// admin/frontend/src/AdminLogin.jsx
// GENESIS Admin — Login Page
//
// Fixes applied:
//   • Credentials sent as JSON body (POST with { username, password })
//     instead of query params (?username=...&password=...)
//     Query params appear in server logs, browser history, and proxy logs
//     in plaintext. Body does not.
//   • Removed `null` as the request body + { params: ... } pattern
//   • Admin token stored in sessionStorage instead of localStorage (XSS mitigation)
//   • Added loading state disable on the submit button
//   • Added rate-limit (429) error message handling

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
    setError('')
    setLoading(true)

    try {
      // ✅ Credentials as JSON body — NOT query params
      const { data } = await axios.post(
        `${ADMIN_API}/login`,
        { username, password },              // JSON body
        { headers: { 'Content-Type': 'application/json' } }
      )

      // ✅ sessionStorage instead of localStorage
      sessionStorage.setItem(TOKEN_KEY, data.access_token)
      onLogin(data.access_token)

    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        setError('Too many attempts. Please wait 60 seconds before trying again.')
      } else if (status === 401) {
        setError('Invalid credentials. Please check your username and password.')
      } else {
        setError(err.response?.data?.detail || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: '#040913',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
    grid: {
      position: 'fixed', inset: 0, opacity: 0.04,
      backgroundImage:
        'linear-gradient(#00f5ff 1px, transparent 1px), linear-gradient(90deg, #00f5ff 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      pointerEvents: 'none',
    },
    card: {
      position: 'relative', zIndex: 1,
      width: '100%', maxWidth: 380, padding: 40,
      background: 'rgba(10,20,40,0.9)',
      border: '1px solid rgba(0,245,255,0.2)',
      boxShadow: '0 0 60px rgba(0,245,255,0.08), inset 0 1px 0 rgba(0,245,255,0.1)',
      borderRadius: 4,
    },
    label: { fontSize: 11, color: '#00f5ff', letterSpacing: 4, marginBottom: 6, opacity: 0.7 },
    title: { fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1 },
    subtitle: { fontSize: 11, color: '#4a6080', marginTop: 4, letterSpacing: 2 },
    divider: { margin: '24px 0', borderColor: 'rgba(0,245,255,0.1)' },
    fieldLabel: { display: 'block', fontSize: 11, color: '#4a6080', letterSpacing: 2, marginBottom: 6 },
    input: {
      width: '100%', background: 'rgba(0,20,40,0.8)',
      border: '1px solid rgba(0,245,255,0.2)', borderRadius: 2,
      color: '#a0d4e8', fontSize: 13, padding: '10px 12px',
      outline: 'none', boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
    error: {
      padding: '10px 14px', marginBottom: 16,
      background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,80,80,0.3)',
      borderRadius: 2, color: '#ff8080', fontSize: 12,
    },
    button: {
      width: '100%', padding: '12px 0',
      background: loading ? 'rgba(0,245,255,0.05)' : 'rgba(0,245,255,0.1)',
      border: '1px solid rgba(0,245,255,0.4)', borderRadius: 2,
      color: loading ? '#4a6080' : '#00f5ff', fontSize: 12,
      letterSpacing: 3, cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', transition: 'all 0.2s',
    },
  }

  return (
    <div style={s.page}>
      <div style={s.grid} />

      <div style={s.card}>
        <div style={{ marginBottom: 32 }}>
          <div style={s.label}>SYSTEM ACCESS</div>
          <div style={s.title}>
            GENESIS<span style={{ color: '#00f5ff' }}>_</span>
          </div>
          <div style={s.subtitle}>ADMIN CONSOLE v1.0</div>
        </div>

        <hr style={s.divider} />

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={s.fieldLabel}>IDENTIFIER</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={s.input}
              placeholder="admin"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={s.fieldLabel}>AUTH KEY</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={s.input}
              placeholder="••••••••••••"
            />
          </div>

          <button type="submit" disabled={loading} style={s.button}>
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>
        </form>
      </div>
    </div>
  )
}

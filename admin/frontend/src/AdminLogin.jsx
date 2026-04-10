import React, { useState } from 'react'
import axios from 'axios'

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await axios.post(
        '/api/v1/admin/login',
        null,
        { params: { username, password } }
      )
      localStorage.setItem('genesis_admin_token', data.access_token)
      onLogin(data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040913',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(#00f5ff 1px, transparent 1px), linear-gradient(90deg, #00f5ff 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 380, padding: 40,
        background: 'rgba(10,20,40,0.9)',
        border: '1px solid rgba(0,245,255,0.2)',
        boxShadow: '0 0 60px rgba(0,245,255,0.08), inset 0 1px 0 rgba(0,245,255,0.1)',
        borderRadius: 4,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#00f5ff', letterSpacing: 4, marginBottom: 6, opacity: 0.7 }}>
            SYSTEM ACCESS
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>
            GENESIS<span style={{ color: '#00f5ff' }}>_</span>
          </div>
          <div style={{ fontSize: 11, color: '#4a6080', marginTop: 4, letterSpacing: 2 }}>
            ADMIN CONTROL PANEL v1.0
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#00f5ff', letterSpacing: 2, marginBottom: 6, opacity: 0.7 }}>
              IDENTIFIER
            </div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,245,255,0.04)',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: 3, padding: '10px 14px',
                color: '#e0f0ff', fontSize: 13,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#00f5ff', letterSpacing: 2, marginBottom: 6, opacity: 0.7 }}>
              PASSKEY
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,245,255,0.04)',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: 3, padding: '10px 14px',
                color: '#e0f0ff', fontSize: 13,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,60,60,0.08)',
              border: '1px solid rgba(255,60,60,0.3)',
              borderRadius: 3, padding: '8px 12px',
              color: '#ff6b6b', fontSize: 12,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            style={{
              marginTop: 8,
              background: loading ? 'rgba(0,245,255,0.05)' : 'rgba(0,245,255,0.1)',
              border: '1px solid rgba(0,245,255,0.4)',
              borderRadius: 3, padding: '11px 0',
              color: '#00f5ff', fontSize: 12, fontWeight: 700,
              letterSpacing: 3, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE →'}
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 10, color: '#2a3a50', textAlign: 'center', letterSpacing: 1 }}>
          GENESIS AI SYSTEM · RESTRICTED ACCESS
        </div>
      </div>
    </div>
  )
}

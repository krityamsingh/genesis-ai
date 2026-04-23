// AdminLogin.jsx — Genesis Admin Login
// Clean, professional login with Genesis branding.
import React, { useState } from 'react'
import axios from 'axios'
import { C, F, btn, input } from './design'

const ADMIN_API = import.meta.env.VITE_ADMIN_API_URL || '/api/admin'

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPw,   setShowPw]   = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Username and password are required.'); return }
    setError(''); setLoading(true)
    try {
      const { data } = await axios.post(`${ADMIN_API}/login`, { username, password }, {
        headers: { 'Content-Type': 'application/json' },
      })
      const tok = data.token || data.access_token
      sessionStorage.setItem('genesis_admin_token', tok)
      onLogin(tok)
    } catch (err) {
      const st = err.response?.status
      const detail = err.response?.data?.detail
      if (st === 429) setError('Too many attempts. Please wait 60 seconds.')
      else if (st === 401) setError('Invalid credentials. Check your username and password.')
      else setError(detail || 'Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.sans,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        width: '100%', maxWidth: 420,
        padding: '48px 40px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: C.bgSidebar,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#93C5FD',
            marginBottom: 18, letterSpacing: -1,
            boxShadow: '0 4px 14px rgba(15,23,42,0.3)',
          }}>G</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: -0.5 }}>
            Genesis Admin
          </h1>
          <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 6, marginBottom: 0 }}>
            Control panel — restricted access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Username
            </label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus autoComplete="username"
              style={{
                ...input(),
                padding: '10px 14px',
                fontSize: 14,
                border: `1.5px solid ${C.border}`,
                transition: 'border-color 120ms',
              }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                style={{
                  ...input(),
                  padding: '10px 44px 10px 14px',
                  fontSize: 14,
                  border: `1.5px solid ${C.border}`,
                  transition: 'border-color 120ms',
                }}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.textMuted, fontSize: 14, padding: 0, lineHeight: 1,
                }}
              >{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>

          {error && (
            <div style={{
              background: C.redLight,
              border: `1px solid #FECACA`,
              color: '#B91C1C',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, lineHeight: 1.5,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...btn('primary'),
              width: '100%', padding: '11px 16px',
              fontSize: 14, fontWeight: 700,
              borderRadius: 10,
              opacity: loading ? 0.75 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
              background: loading ? C.textSecondary : C.bgSidebar,
              boxShadow: loading ? 'none' : '0 2px 8px rgba(15,23,42,0.25)',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Signing in…
              </span>
            ) : 'Sign in to Admin Panel'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 24, marginBottom: 0 }}>
          Genesis AI • Admin Dashboard v3
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

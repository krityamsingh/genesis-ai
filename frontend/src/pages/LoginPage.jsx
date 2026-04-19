// frontend/src/pages/LoginPage.jsx — NEW FILE
// Claude.ai-style login: white card, Google button, phone OTP, email+password fallback.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/design-system.css'

const API = '/api/v1'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('main')  // main | phone | email
  const [phone,    setPhone]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [otpSent,  setOtpSent]  = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const err = (msg) => { setError(msg); setLoading(false) }

  const handleGoogleLogin = () => {
    window.location.href = `${API}/auth/google`
  }

  const handleSendOtp = async () => {
    if (!phone.startsWith('+')) return err('Phone must start with + (e.g. +91...)')
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/auth/otp/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) return err(data.detail || 'Failed to send OTP')
      setOtpSent(true)
      setLoading(false)
    } catch { err('Network error') }
  }

  const handleVerifyOtp = async () => {
    if (!otp) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/auth/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) return err(data.detail || 'Invalid code')
      localStorage.setItem('genesis_token',   data.access_token)
      localStorage.setItem('genesis_refresh',  data.refresh_token)
      if (data.needs_name_setup) navigate('/setup-name')
      else { if (onLogin) onLogin(); navigate('/chat') }
    } catch { err('Network error') }
  }

  const handlePasswordLogin = async () => {
    if (!username || !password) return err('Enter username and password')
    setLoading(true); setError('')
    try {
      const form = new URLSearchParams({ username, password, grant_type: 'password' })
      const res  = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) return err(data.detail || 'Invalid credentials')
      localStorage.setItem('genesis_token',  data.access_token)
      localStorage.setItem('genesis_refresh', data.refresh_token)
      if (onLogin) onLogin()
      navigate('/chat')
    } catch { err('Network error') }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F4F4F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans, system-ui)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 40 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#1A1A1A', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, marginBottom: 14,
          }}>G</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            Welcome to Genesis
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
            Your self-learning AI assistant
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2', color: '#991B1B', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, marginBottom: 16,
          }}>{error}</div>
        )}

        {tab === 'main' && (
          <>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
              onClick={handleGoogleLogin}>
              <GoogleIcon /> Continue with Google
            </button>

            <div className="divider" style={{ margin: '4px 0' }}>or</div>

            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 12, marginBottom: 8 }}
              onClick={() => { setTab('phone'); setError('') }}>
              📱 Login with Phone (OTP)
            </button>

            <div className="divider" style={{ margin: '4px 0' }}>or</div>

            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }}
              onClick={() => { setTab('email'); setError('') }}>
              Email &amp; password
            </button>
          </>
        )}

        {tab === 'phone' && (
          <>
            <button onClick={() => { setTab('main'); setOtpSent(false); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              ← Back
            </button>
            {!otpSent ? (
              <>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  Phone number
                </label>
                <input className="input" placeholder="+91 98765 43210" value={phone}
                  onChange={e => setPhone(e.target.value)} style={{ marginBottom: 16 }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()} />
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading} onClick={handleSendOtp}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Enter the 6-digit code sent to {phone}
                </p>
                <input className="input" placeholder="123456" value={otp}
                  onChange={e => setOtp(e.target.value)} maxLength={6}
                  style={{ marginBottom: 16, letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} />
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading} onClick={handleVerifyOtp}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button onClick={handleSendOtp}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, marginTop: 12, display: 'block', textAlign: 'center', width: '100%' }}>
                  Resend code
                </button>
              </>
            )}
          </>
        )}

        {tab === 'email' && (
          <>
            <button onClick={() => { setTab('main'); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              ← Back
            </button>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Username</label>
            <input className="input" placeholder="admin" value={username}
              onChange={e => setUsername(e.target.value)} style={{ marginBottom: 12 }} />
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} style={{ marginBottom: 20 }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()} />
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading} onClick={handlePasswordLogin}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

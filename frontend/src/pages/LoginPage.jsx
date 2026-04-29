// frontend/src/pages/LoginPage.jsx — v3 UPGRADE
// Polished Claude.ai-style auth: Google, OTP, email/password tabs
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import { authAPI } from '../api/client'
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

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
      <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px', fontSize: 14, fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-1)' : 'var(--text-3)',
        background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
        transition: 'all 150ms', fontFamily: 'var(--font-sans)',
      }}
    >{children}</button>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setUser } = useGenesisStore()
  const [tab, setTab] = useState('email')   // email | phone
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const err = (msg) => { setError(msg); setLoading(false) }

  const handleGoogle = () => {
    authAPI.googleLogin()
  }

  const handleSendOtp = async () => {
    if (!phone.startsWith('+')) return err('Phone must start with + and country code (e.g. +1…)')
    setLoading(true); setError('')
    try {
      const { data } = await authAPI.sendOtp(phone)
      setOtpSent(true); setSuccess('Code sent!'); setLoading(false)
    } catch (e) {
      err(e.response?.data?.detail || 'Failed to send code')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { data } = await authAPI.verifyOtp(phone, otp)
      setToken(data.access_token)
      if (data.refresh_token) localStorage.setItem('genesis_refresh', data.refresh_token)
      
      // Fetch user profile
      try {
        const meRes = await authAPI.me()
        setUser(meRes.data)
      } catch {}

      if (data.needs_name_setup) navigate('/setup-name')
      else navigate('/chat')
    } catch (e) {
      err(e.response?.data?.detail || 'Invalid code')
    }
  }

  const handleEmailLogin = async () => {
    if (!username || !password) return err('Enter username and password')
    setLoading(true); setError('')
    try {
      const { data } = await authAPI.login(username, password)
      setToken(data.access_token)
      if (data.refresh_token) localStorage.setItem('genesis_refresh', data.refresh_token)
      
      // Fetch user profile
      try {
        const meRes = await authAPI.me()
        setUser(meRes.data)
      } catch {}

      navigate('/chat')
    } catch (e) {
      err(e.response?.data?.detail || 'Invalid credentials')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Left decorative panel */}
      <div style={{
        display: 'none',
        flex: 1,
        background: 'linear-gradient(135deg, #1C1917 0%, #292524 50%, #1C1917 100%)',
        position: 'relative', overflow: 'hidden',
      }}
        className="login-panel"
      >
        {/* We'll just show this on CSS at md breakpoint */}
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.3s ease' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
              borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 24,
              fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff',
              boxShadow: '0 4px 16px rgba(217,119,6,0.25)',
            }}>G</div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 28, fontWeight: 'normal', color: 'var(--text-1)', marginBottom: 6,
            }}>Welcome to Genesis</h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
              Sign in to continue
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 15, borderRadius: 'var(--r-md)' }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <Divider label="or" />

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-1)', marginBottom: 20 }}>
            <TabButton active={tab === 'email'} onClick={() => { setTab('email'); setError('') }}>
              Email / Password
            </TabButton>
            <TabButton active={tab === 'phone'} onClick={() => { setTab('phone'); setError('') }}>
              Phone OTP
            </TabButton>
          </div>

          {/* Email tab */}
          {tab === 'email' && (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleEmailLogin(); }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                  Username
                </label>
                <input
                  className="input"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_username"
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 14, color: 'var(--text-4)',
                    }}
                  >{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--r-md)',
                  background: 'var(--error-bg)', color: 'var(--error)',
                  fontSize: 13, animation: 'fadeIn 0.2s ease',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: 44, marginTop: 4 }}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                ) : 'Sign in'}
              </button>
            </form>
          )}

          {/* Phone tab */}
          {tab === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!otpSent ? (
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                      Phone number
                    </label>
                    <input
                      className="input"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      autoFocus
                    />
                  </div>
                  {error && (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--error-bg)', color: 'var(--error)', fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', height: 44 }}
                    disabled={loading}
                  >
                    {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : 'Send code'}
                  </button>
                </form>
              ) : (
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <p style={{ fontSize: 14, color: 'var(--text-2)', textAlign: 'center' }}>
                    Enter the 6-digit code sent to <strong>{phone}</strong>
                  </p>
                  <input
                    className="input"
                    type="text"
                    name="otp"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8, fontFamily: 'var(--font-mono)' }}
                    autoFocus
                    maxLength={6}
                  />
                  {error && (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--error-bg)', color: 'var(--error)', fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--success-bg)', color: 'var(--success)', fontSize: 13 }}>
                      {success}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', height: 44 }}
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : 'Verify & sign in'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                    onClick={() => { setOtpSent(false); setOtp(''); setError(''); setSuccess('') }}
                  >
                    ← Change number
                  </button>
                </form>
              )}
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-4)' }}>
            By signing in, you agree to our Terms of Service
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// ── Floating particles ────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left:     `${10 + Math.random() * 80}%`,
  top:      `${10 + Math.random() * 80}%`,
  duration: `${4 + Math.random() * 6}s`,
  delay:    `${Math.random() * 4}s`,
  opacity:  0.2 + Math.random() * 0.5,
  size:     2 + Math.random() * 4,
}))

// ── Feature callouts ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '📚', title: 'Learn from any source', sub: 'URLs, PDFs, audio, video, code' },
  { icon: '⚡', title: 'Real-time streaming',    sub: 'Token-by-token generation with WebSockets' },
  { icon: '⬡', title: '6 AI modules',            sub: 'Self-learn, research, build, reconstruct, simulate' },
]

// ── Google SVG ─────────────────────────────────────────────────────────────────
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

// ── Shake animation ───────────────────────────────────────────────────────────
const shakeStyle = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes particleFloat {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
  33%       { transform: translateY(-20px) translateX(8px); opacity: 0.8; }
  66%       { transform: translateY(-8px) translateX(-12px); opacity: 0.5; }
}
@keyframes formIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

// ═══════════════════════════════════════════════════════════════════════════════
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [shake,    setShake]    = useState(false)

  const { login, authed }  = useGenesisStore()
  const navigate           = useNavigate()
  const location           = useLocation()
  const [searchParams]     = useSearchParams()
  const from               = location.state?.from?.pathname || '/dashboard'

  useEffect(() => { if (authed) navigate(from, { replace: true }) }, [authed]) // eslint-disable-line

  // Show OAuth error if present in URL params
  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError === 'oauth_failed') setError('Google sign-in failed. Please try again.')
    if (oauthError === 'missing_token') setError('Authentication error. Please try again.')
  }, []) // eslint-disable-line

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password required.')
      triggerShake()
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e.response?.data?.detail || 'Authentication failed. Check credentials.')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`
  }

  return (
    <>
      <style>{shakeStyle}</style>
      <div style={{
        display:    'flex',
        height:     '100vh',
        background: 'var(--bg-base)',
        overflow:   'hidden',
      }}>
        {/* ── Left decorative panel ── */}
        <div style={{
          flex:           1,
          position:       'relative',
          overflow:       'hidden',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            '28px',
        }}>
          {/* Gradient mesh background */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(99,102,241,.15), transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(34,197,94,.08), transparent 50%),
              radial-gradient(ellipse at 60% 80%, rgba(236,72,153,.06), transparent 45%)
            `,
          }} />

          {/* Floating particles */}
          {PARTICLES.map(p => (
            <div key={p.id} style={{
              position:         'absolute',
              left:             p.left,
              top:              p.top,
              width:            `${p.size}px`,
              height:           `${p.size}px`,
              borderRadius:     '50%',
              background:       'var(--accent)',
              animation:        `particleFloat ${p.duration} ease-in-out infinite`,
              animationDelay:   p.delay,
              opacity:          p.opacity,
            }} />
          ))}

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{
              width:          '72px',
              height:         '72px',
              background:     'linear-gradient(135deg, var(--accent), var(--pink))',
              borderRadius:   '50%',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '32px',
              margin:         '0 auto 16px',
              boxShadow:      '0 0 40px var(--accent-glow)',
            }}>🔥</div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '-.5px' }}>GENESIS</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '4px' }}>
              Autonomous Intelligence Engine
            </div>
          </div>

          {/* Feature callouts */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px', width: '100%', padding: '0 20px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '12px',
                background:   'rgba(255,255,255,.03)',
                border:       '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding:      '12px 16px',
              }}>
                <span style={{ fontSize: '20px' }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{f.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{
          width:          '440px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '40px',
          borderLeft:     '1px solid var(--border-subtle)',
          background:     'var(--bg-subtle)',
        }}>
          <div style={{
            width:     '100%',
            maxWidth:  '360px',
            animation: 'formIn 400ms var(--ease-out)',
          }}>
            {/* Heading */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px' }}>Welcome back</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Sign in to GENESIS</p>
            </div>

            {/* Google OAuth button */}
            <button
              onClick={handleGoogleLogin}
              style={{
                width:          '100%',
                padding:        '11px 16px',
                background:     '#fff',
                color:          '#1F1F1F',
                border:         '1px solid rgba(0,0,0,.12)',
                borderRadius:   '10px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '10px',
                fontSize:       '14px',
                fontWeight:     '500',
                fontFamily:     "'DM Sans', sans-serif",
                cursor:         'pointer',
                transition:     'box-shadow 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '12px', margin: '16px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
              or
              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            </div>

            {/* Credentials form */}
            <div style={{
              display:       'flex',
              flexDirection: 'column',
              gap:           '10px',
              animation:     shake ? 'shake 0.4s ease-in-out' : 'none',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '4px' }}>Username</div>
                <input
                  className="input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="admin"
                  autoFocus
                  autoComplete="username"
                  style={{ border: error ? '1px solid var(--red)' : undefined }}
                />
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '4px' }}>Password</div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ paddingRight: '40px', border: error ? '1px solid var(--red)' : undefined }}
                  />
                  <button
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1 }}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  padding:      '8px 12px',
                  background:   'var(--red-dim)',
                  border:       '1px solid rgba(239,68,68,.3)',
                  borderRadius: '8px',
                  fontSize:     '12px',
                  color:        'var(--red)',
                }}>
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '4px' }}
              >
                {loading ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                    Authenticating...
                  </>
                ) : 'Sign in →'}
              </button>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-accent)', cursor: 'pointer' }}>Forgot password?</span>
              {' · '}
              <span style={{ color: 'var(--text-accent)', cursor: 'pointer' }}>New user? Contact admin</span>
            </div>

            {/* Demo hint */}
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Demo: <span style={{ color: 'var(--accent-bright)' }}>admin</span> / <span style={{ color: 'var(--accent-bright)' }}>genesis</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import Loader from '../components/Loader'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const { login, authed } = useGenesisStore()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from?.pathname || '/dashboard'

  useEffect(() => { if (authed) navigate(from, { replace: true }) }, [authed]) // eslint-disable-line

  const submit = async () => {
    if (!username || !password) { setError('Credentials required.'); return }
    setLoading(true); setError('')
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e.response?.data?.detail || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => e.key === 'Enter' && submit()

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 30%, rgba(245,158,11,.07) 0%, transparent 55%), var(--bg0)`,
      backgroundImage: `radial-gradient(circle at 50% 30%, rgba(245,158,11,.07) 0%, transparent 55%), radial-gradient(circle, var(--b0) 1px, transparent 1px)`,
      backgroundSize: 'cover, 24px 24px',
    }}>
      <div
        className="animate-fadein"
        style={{
          width: 368, padding: 28,
          background: 'var(--bg1)',
          border: '1px solid var(--b1)',
          borderRadius: 10,
          boxShadow: '0 28px 56px rgba(0,0,0,.55)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px',
            background: 'rgba(245,158,11,.1)',
            border: '1px solid rgba(245,158,11,.25)',
            borderRadius: 6, marginBottom: 10,
            boxShadow: '0 0 18px rgba(245,158,11,.1)',
          }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700, fontSize: 15,
              color: 'var(--acc)', letterSpacing: '.1em',
            }}>GENESIS</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', letterSpacing: '.1em' }}>
            AUTONOMOUS INTELLIGENCE ENGINE
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px',
          background: 'var(--bg0)',
          border: '1px solid var(--b0)',
          borderRadius: 4, marginBottom: 18,
          fontSize: 10, color: 'var(--t2)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gr)',
            display: 'inline-block', flexShrink: 0,
          }} />
          auth.genesis.local &nbsp;·&nbsp; JWT &nbsp;·&nbsp; TLS
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="g-label" style={{ marginBottom: 4 }}>USERNAME</div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={onKey}
              placeholder="admin"
              style={{ width: '100%', padding: '9px 12px' }}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <div className="g-label" style={{ marginBottom: 4 }}>PASSWORD</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={onKey}
                placeholder="••••••••"
                style={{ width: '100%', padding: '9px 36px 9px 12px' }}
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--t2)', fontSize: 12, padding: 0,
                }}
              >
                {showPw ? '👁' : '○'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(244,63,94,.1)',
              border: '1px solid rgba(244,63,94,.3)',
              borderRadius: 4, fontSize: 11, color: 'var(--rd)',
            }}>
              {error}
            </div>
          )}

          <button
            className="g-btn-primary"
            onClick={submit}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4, fontSize: 13 }}
          >
            {loading ? (
              <><Loader size={13} color="#06060A" /> AUTHENTICATING...</>
            ) : (
              '→ SIGN IN'
            )}
          </button>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: 'var(--t2)' }}>
          demo: <span style={{ color: 'var(--acc)' }}>admin</span> / genesis
        </div>
      </div>
    </div>
  )
}

// ── pages/AuthCallback.jsx ────────────────────────────────────────────────────
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'

export default function AuthCallback() {
  const [params]           = useSearchParams()
  const navigate           = useNavigate()
  const { loginWithToken } = useGenesisStore()

  useEffect(() => {
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const error        = params.get('error')

    if (error) {
      navigate('/login?error=' + error, { replace: true })
      return
    }
    if (accessToken) {
      loginWithToken(accessToken, refreshToken)
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login?error=missing_token', { replace: true })
    }
  }, []) // eslint-disable-line

  return (
    <div style={{
      height:         '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'var(--bg-base)',
      flexDirection:  'column',
      gap:            '16px',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        width:        '40px',
        height:       '40px',
        border:       '2px solid var(--border-default)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation:    'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Signing you in...</span>
    </div>
  )
}

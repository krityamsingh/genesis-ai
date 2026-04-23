// frontend/src/pages/AuthCallback.jsx — handles Google OAuth redirect
// Reads tokens from URL params, stores them, routes to setup-name or chat.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const access  = params.get('access_token')
    const refresh = params.get('refresh_token')
    const needsNs = params.get('needs_name_setup') === 'true'
    const err     = params.get('error')

    if (err || !access) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    localStorage.setItem('genesis_token',  access)
    if (refresh) localStorage.setItem('genesis_refresh', refresh)

    navigate(needsNs ? '/setup-name' : '/chat', { replace: true })
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280', fontSize: 14 }}>Completing sign in…</p>
    </div>
  )
}

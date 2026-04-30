import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import { authAPI } from '../api/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setToken, setUser } = useGenesisStore()

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

    setToken(access)
    if (refresh) localStorage.setItem('genesis_refresh', refresh)

    // Fetch user profile
    const fetchMe = async () => {
      try {
        const meRes = await authAPI.me()
        setUser(meRes.data)
      } catch {}
      navigate(needsNs ? '/setup-name' : '/chat', { replace: true })
    }
    
    fetchMe()
  }, [navigate, setToken, setUser])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280', fontSize: 14 }}>Completing sign in…</p>
    </div>
  )
}

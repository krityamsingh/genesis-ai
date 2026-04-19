// frontend/src/pages/NameSetupPage.jsx — NEW FILE
// First-time onboarding: user sets their display name.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/design-system.css'

const API = '/api/v1'

export default function NameSetupPage() {
  const navigate    = useNavigate()
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Please enter a name.')
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('genesis_token')
      const res   = await fetch(`${API}/auth/setup-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: trimmed }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return setError(d.detail || 'Failed to save name.')
      }
      navigate('/chat', { replace: true })
    } catch {
      setError('Network error.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F4F4F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans, system-ui)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 48, textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: '#1A1A1A', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, marginBottom: 20,
        }}>G</div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>What should we call you?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
          This name will appear in your conversations.
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ textAlign: 'center', fontSize: 16, marginBottom: 20 }}
          autoFocus
        />
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
          disabled={loading || !name.trim()}
          onClick={handleSubmit}
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

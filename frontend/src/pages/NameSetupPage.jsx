import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import { authAPI } from '../api/client'
import '../styles/design-system.css'

export default function NameSetupPage() {
  const navigate = useNavigate()
  const { setUser } = useGenesisStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Please enter your name')
    setLoading(true); setError('')
    try {
      const res = await authAPI.setupName(name.trim())
      
      // Update store with new name
      try {
        const meRes = await authAPI.me()
        setUser(meRes.data)
      } catch {}

      navigate('/chat')
    } catch (e) { 
      setError(e.response?.data?.detail || e.message)
      setLoading(false) 
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.3s ease', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto 20px', background: 'linear-gradient(135deg, #D97706, #92400E)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff' }}>G</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, fontWeight: 'normal', marginBottom: 8 }}>What should we call you?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28 }}>This helps Genesis personalize your experience.</p>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          style={{ textAlign: 'center', fontSize: 16, height: 48, marginBottom: 12 }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--error-bg)', color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44 }} onClick={handleSubmit} disabled={loading || !name.trim()}>
          {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : 'Get started →'}
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }} onClick={() => navigate('/chat')}>Skip for now</button>
      </div>
    </div>
  )
}

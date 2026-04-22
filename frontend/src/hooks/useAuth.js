// frontend/src/hooks/useAuth.js — v3 UPGRADE
import { useState, useEffect, useCallback } from 'react'

const BASE = '/api/v1'

function getToken()    { return localStorage.getItem('genesis_token') }
function getRefresh()  { return localStorage.getItem('genesis_refresh') }
function clearTokens() { localStorage.removeItem('genesis_token'); localStorage.removeItem('genesis_refresh') }

export default function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [authed,  setAuthed]  = useState(false)

  const authHeaders = user ? { Authorization: `Bearer ${getToken()}` } : {}

  const fetchMe = useCallback(async (token) => {
    try {
      const res = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('unauthorized')
      const data = await res.json()
      setUser(data)
      setAuthed(true)
      return data
    } catch {
      // Try refresh
      const refresh = getRefresh()
      if (refresh) {
        try {
          const rRes = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh }),
          })
          if (rRes.ok) {
            const rData = await rRes.json()
            localStorage.setItem('genesis_token', rData.access_token)
            return await fetchMe(rData.access_token)
          }
        } catch {}
      }
      clearTokens()
      setUser(null)
      setAuthed(false)
      return null
    }
  }, [])

  useEffect(() => {
    const token = getToken()
    if (token) {
      fetchMe(token).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  const logout = useCallback(async () => {
    const token = getToken()
    if (token) {
      try {
        await fetch(`${BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {}
    }
    clearTokens()
    setUser(null)
    setAuthed(false)
  }, [])

  const refreshUser = useCallback(() => {
    const token = getToken()
    if (token) return fetchMe(token)
    return Promise.resolve(null)
  }, [fetchMe])

  return { user, loading, authed, logout, authHeaders, refreshUser }
}

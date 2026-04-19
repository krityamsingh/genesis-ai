// frontend/src/hooks/useAuth.js — NEW FILE
// Manages JWT auth state: reads/writes token, fetches /auth/me on mount,
// handles refresh, exposes user, isAdmin, login, logout.

import { useState, useEffect, useCallback } from 'react'

const TOKEN_KEY   = 'genesis_token'
const REFRESH_KEY = 'genesis_refresh'
const API_BASE    = '/api/v1'

export default function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  const getToken   = () => localStorage.getItem(TOKEN_KEY)
  const getRefresh = () => localStorage.getItem(REFRESH_KEY)

  const saveTokens = (access, refresh) => {
    if (access)  localStorage.setItem(TOKEN_KEY,   access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  }

  const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${getToken()}`,
  })

  // Validate stored token by calling /auth/me
  const fetchMe = useCallback(async () => {
    const token = getToken()
    if (!token) { setLoading(false); return }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else if (res.status === 401) {
        // Try refresh
        const refreshed = await doRefresh()
        if (!refreshed) { clearTokens(); setUser(null) }
      }
    } catch {
      // Network error — keep user logged in optimistically
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  const doRefresh = async () => {
    const rt = getRefresh()
    if (!rt) return false
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      })
      if (res.ok) {
        const { access_token } = await res.json()
        localStorage.setItem(TOKEN_KEY, access_token)
        await fetchMe()
        return true
      }
    } catch {}
    return false
  }

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username, password) => {
    const form = new URLSearchParams({ username, password, grant_type: 'password' })
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    saveTokens(data.access_token, data.refresh_token)
    await fetchMe()
    return data
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST', headers: authHeaders(),
      })
    } catch {}
    clearTokens()
    setUser(null)
  }

  const setupName = async (displayName) => {
    const res = await fetch(`${API_BASE}/auth/setup-name`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ display_name: displayName }),
    })
    if (!res.ok) throw new Error('Failed to save display name')
    await fetchMe()
    return res.json()
  }

  return {
    user,
    loading,
    isAdmin: !!user?.is_admin,
    authed:  !!user,
    needsNameSetup: !!user?.needs_name_setup,
    login,
    logout,
    setupName,
    getToken,
    authHeaders,
    refetchUser: fetchMe,
  }
}

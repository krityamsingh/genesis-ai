// frontend/src/api/client.js
// GENESIS — Axios HTTP Client
//
// Fixes applied:
//   • Token read from sessionStorage instead of localStorage (XSS mitigation)
//   • 429 responses handled: shows retry-after delay instead of redirect
//   • Request interceptor pulls fresh token on every request (store may have
//     refreshed the token since the instance was created)
//   • Response interceptor fires tryRefresh() on 401 before hard-redirecting,
//     giving the refresh flow one chance to recover the session silently

import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 60_000,
})

// ── Request interceptor: attach fresh token on every call ────────────────────
client.interceptors.request.use((config) => {
  // Always read from sessionStorage so we pick up refreshed tokens
  const token = sessionStorage.getItem('genesis_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 and 429 globally ────────────────────────
let _refreshing = false
let _refreshQueue = []   // callbacks waiting for the refresh to complete

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  )
  _refreshQueue = []
}

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    // ── 401: try token refresh before redirecting to /login ──────────────────
    if (err.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true

      if (_refreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      _refreshing = true

      const refreshToken = sessionStorage.getItem('genesis_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${client.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
          )
          const newToken = data.access_token
          sessionStorage.setItem('genesis_token', newToken)
          processQueue(null, newToken)
          _refreshing = false

          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return client(originalRequest)
        } catch (refreshErr) {
          processQueue(refreshErr, null)
          _refreshing = false
        }
      } else {
        _refreshing = false
      }

      // Refresh failed or no refresh token — clear session and redirect
      sessionStorage.removeItem('genesis_token')
      sessionStorage.removeItem('genesis_refresh_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // ── 429: surface retry-after info instead of silently failing ────────────
    if (err.response?.status === 429) {
      const retryAfter = err.response.headers['retry-after'] || '60'
      const msg = `Rate limit exceeded. Please wait ${retryAfter} seconds.`
      return Promise.reject(new Error(msg))
    }

    return Promise.reject(err)
  }
)

export default client

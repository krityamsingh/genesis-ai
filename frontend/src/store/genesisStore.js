// frontend/src/store/genesisStore.js
// GENESIS — Global App State (Zustand)
//
// Fixes applied:
//   • Token storage moved from localStorage → sessionStorage
//     localStorage persists indefinitely and is accessible to any JS on the
//     page — XSS anywhere = permanent session theft.
//     sessionStorage tokens die when the tab closes, limiting the attack window.
//   • Added refreshToken storage + auto-refresh logic
//   • Added /me call on store init so the app validates the stored token
//     against the server on every page load (catches expired/revoked tokens)
//   • learnError now cleared on next learn() call (was already done, kept)
//   • Added 401 handling in ask() so expired mid-session tokens auto-logout

import { create } from 'zustand'
import * as api from '../api/endpoints'

// ── Storage helpers (sessionStorage instead of localStorage) ─────────────────
// Change these two functions to switch storage strategy project-wide.

const storage = {
  get: (key) => sessionStorage.getItem(key),
  set: (key, val) => sessionStorage.setItem(key, val),
  del: (key) => sessionStorage.removeItem(key),
}

const TOKEN_KEY   = 'genesis_token'
const REFRESH_KEY = 'genesis_refresh_token'


// ── Store ─────────────────────────────────────────────────────────────────────

const useGenesisStore = create((set, get) => ({

  // ── Auth ──────────────────────────────────────────────────────────────────
  token:    storage.get(TOKEN_KEY)   || null,
  isAuthed: !!storage.get(TOKEN_KEY),
  user:     null,   // { user_id, username, email, is_admin }

  setToken: (token, refreshToken = null) => {
    storage.set(TOKEN_KEY, token)
    if (refreshToken) storage.set(REFRESH_KEY, refreshToken)
    set({ token, isAuthed: true })
  },

  logout: () => {
    storage.del(TOKEN_KEY)
    storage.del(REFRESH_KEY)
    set({ token: null, isAuthed: false, user: null, messages: [], stats: null })
  },

  // Validate stored token against server on app boot
  validateToken: async () => {
    const token = storage.get(TOKEN_KEY)
    if (!token) return

    try {
      const { data } = await api.getMe()
      set({ user: data, isAuthed: true })
    } catch (err) {
      // Token is invalid or expired — try refresh before logging out
      if (err.response?.status === 401) {
        const refreshed = await get().tryRefresh()
        if (!refreshed) get().logout()
      }
    }
  },

  // Attempt to get a new access token using the stored refresh token
  tryRefresh: async () => {
    const refreshToken = storage.get(REFRESH_KEY)
    if (!refreshToken) return false
    try {
      const { data } = await api.refreshToken(refreshToken)
      storage.set(TOKEN_KEY, data.access_token)
      set({ token: data.access_token, isAuthed: true })
      return true
    } catch {
      return false
    }
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats:      null,
  statsError: null,
  fetchStats: async () => {
    try {
      const { data } = await api.getStats()
      set({ stats: data, statsError: null })
    } catch (e) {
      set({ statsError: e.message })
      console.error('fetchStats:', e)
    }
  },

  // ── Learning ───────────────────────────────────────────────────────────────
  learnResult:  null,
  learnLoading: false,
  learnError:   null,
  learn: async (source) => {
    set({ learnLoading: true, learnError: null, learnResult: null })
    try {
      const { data } = await api.learn(source)
      set({ learnResult: data, learnLoading: false })
      return data
    } catch (e) {
      const msg = e.response?.data?.detail || e.message
      set({ learnError: msg, learnLoading: false })
    }
  },

  // ── Chat ───────────────────────────────────────────────────────────────────
  messages: [],

  addMessage: (role, content) =>
    set((s) => ({
      messages: [...s.messages, { role, content, ts: Date.now() }],
    })),

  clearMessages: () => set({ messages: [] }),

  ask: async (query) => {
    get().addMessage('user', query)
    try {
      const { data } = await api.ask(query)
      get().addMessage('assistant', data.result)
      return data.result
    } catch (e) {
      const status = e.response?.status
      if (status === 401) {
        // Token expired mid-session — try refresh once, then logout
        const refreshed = await get().tryRefresh()
        if (refreshed) {
          return get().ask(query)   // retry once with new token
        }
        get().logout()
        window.location.href = '/login'
        return
      }
      const msg = e.response?.data?.detail || e.message || 'Request failed'
      get().addMessage('assistant', `Error: ${msg}`)
    }
  },

}))

export default useGenesisStore

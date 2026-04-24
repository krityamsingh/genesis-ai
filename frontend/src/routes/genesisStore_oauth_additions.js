// ── store/genesisStore_oauth_additions.js ─────────────────────────────────────
// Add these to your existing genesisStore.js

// ── Import addition ───────────────────────────────────────────────────────────
// import { getMe } from '../api/endpoints'

// ── Add to your Zustand store's actions ───────────────────────────────────────

const oauthAdditions = {
  /**
   * Called after a successful Google OAuth redirect.
   * Stores tokens and fetches the user profile.
   *
   * @param {string} accessToken
   * @param {string|null} refreshToken
   */
  loginWithToken: async (accessToken, refreshToken) => {
    localStorage.setItem('genesis_token', accessToken)
    if (refreshToken) {
      localStorage.setItem('genesis_refresh_token', refreshToken)
    }

    let user = null
    try {
      const meRes = await getMe()   // GET /api/v1/auth/me
      user = meRes.data
    } catch {
      // If /me fails, set minimal user object so UI still works
      user = { username: 'User' }
    }

    set({ token: accessToken, user, authed: true })
  },
}

export default oauthAdditions

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PATCHED genesisStore.js — replace your existing file with this
// ═══════════════════════════════════════════════════════════════════════════════

/*
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginApi, getMe, getStats, getModules } from '../api/endpoints'

const useGenesisStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────────
      token:   null,
      user:    null,
      authed:  false,
      stats:   null,
      modules: [],

      // ── Standard login (username + password) ───────────────────────────────
      login: async (username, password) => {
        const res = await loginApi(username, password)
        const { access_token, refresh_token } = res.data
        localStorage.setItem('genesis_token', access_token)
        if (refresh_token) localStorage.setItem('genesis_refresh_token', refresh_token)
        const meRes = await getMe()
        set({ token: access_token, user: meRes.data, authed: true })
      },

      // ── Google OAuth login ──────────────────────────────────────────────────
      loginWithToken: async (accessToken, refreshToken) => {
        localStorage.setItem('genesis_token', accessToken)
        if (refreshToken) localStorage.setItem('genesis_refresh_token', refreshToken)
        let user = { username: 'User' }
        try {
          const meRes = await getMe()
          user = meRes.data
        } catch {}
        set({ token: accessToken, user, authed: true })
      },

      // ── Logout ─────────────────────────────────────────────────────────────
      logout: () => {
        localStorage.removeItem('genesis_token')
        localStorage.removeItem('genesis_refresh_token')
        set({ token: null, user: null, authed: false })
      },

      // ── Data fetchers ───────────────────────────────────────────────────────
      fetchStats: async () => {
        try {
          const res = await getStats()
          set({ stats: res.data })
        } catch {}
      },
      fetchModules: async () => {
        try {
          const res = await getModules()
          set({ modules: res.data })
        } catch {}
      },
    }),
    {
      name:    'genesis-store',
      partialize: (state) => ({
        token:  state.token,
        user:   state.user,
        authed: state.authed,
      }),
    }
  )
)

export default useGenesisStore
*/

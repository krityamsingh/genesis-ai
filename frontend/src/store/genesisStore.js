import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useGenesisStore = create(
  persist(
    (set, get) => ({
      // ── Auth State ────────────────────────────────────────────────────────
      authed: !!localStorage.getItem('genesis_token'),
      user: null,
      token: localStorage.getItem('genesis_token'),

      setUser: (user) => {
        set({ user, authed: !!user })
      },

      setAuthed: (authed) => {
        set({ authed })
      },

      setToken: (token) => {
        if (token) {
          localStorage.setItem('genesis_token', token)
        } else {
          localStorage.removeItem('genesis_token')
        }
        set({ token, authed: !!token })
      },

      logout: () => {
        localStorage.removeItem('genesis_token')
        localStorage.removeItem('genesis_refresh')
        set({ user: null, authed: false, token: null })
      },

      // ── App Stats ─────────────────────────────────────────────────────────
      stats: null,
      fetchStats: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await fetch('/api/v1/core/stats', { 
            headers: { Authorization: `Bearer ${token}` } 
          })
          if (res.ok) set({ stats: await res.json() })
        } catch (err) {
          console.error('Failed to fetch stats:', err)
        }
      },

      // ── Modules ───────────────────────────────────────────────────────────
      trainedModules: [],
      fetchModules: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await fetch('/api/v1/modules/', { 
            headers: { Authorization: `Bearer ${token}` } 
          })
          if (res.ok) {
            const data = await res.json()
            set({ trainedModules: Array.isArray(data) ? data : data.modules || [] })
          }
        } catch (err) {
          console.error('Failed to fetch modules:', err)
        }
      },

      // ── UI State ──────────────────────────────────────────────────────────
      theme: localStorage.getItem('genesis_theme') || 'dark',
      setTheme: (theme) => {
        localStorage.setItem('genesis_theme', theme)
        set({ theme })
      },

      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'genesis-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed
      }),
    }
  )
)

export default useGenesisStore


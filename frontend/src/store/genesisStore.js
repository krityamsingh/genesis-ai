// frontend/src/store/genesisStore.js — v3 UPGRADE
// Zustand store (falls back to useState-style if zustand not present)
let _useStore

try {
  const { create } = require('zustand')
  _useStore = create((set, get) => ({
    // Auth
    authed: !!localStorage.getItem('genesis_token'),
    user: null,
    setUser:   (user)   => set({ user, authed: !!user }),
    setAuthed: (authed) => set({ authed }),

    // Stats
    stats: null,
    fetchStats: async () => {
      const token = localStorage.getItem('genesis_token')
      if (!token) return
      try {
        const res = await fetch('/api/v1/stats', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) set({ stats: await res.json() })
      } catch {}
    },

    // Modules
    trainedModules: [],
    fetchModules: async () => {
      const token = localStorage.getItem('genesis_token')
      if (!token) return
      try {
        const res = await fetch('/api/v1/modules', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          set({ trainedModules: Array.isArray(data) ? data : data.modules || [] })
        }
      } catch {}
    },

    // Theme
    theme: localStorage.getItem('genesis_theme') || 'light',
    setTheme: (theme) => {
      localStorage.setItem('genesis_theme', theme)
      set({ theme })
    },

    // Sidebar
    sidebarCollapsed: false,
    toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  }))
} catch {
  // Fallback minimal store
  const state = {
    authed: !!localStorage.getItem('genesis_token'),
    user: null, stats: null, trainedModules: [], theme: 'light', sidebarCollapsed: false,
    setUser: () => {}, setAuthed: () => {},
    fetchStats: async () => {}, fetchModules: async () => {},
    setTheme: () => {}, toggleSidebar: () => {},
  }
  _useStore = () => state
}

export default _useStore

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// FIX: use named exports from endpoints.js for auth (correct OAuth2 form encoding)
// and keep using client.js barrel exports for core/module/admin
import { login as apiLogin, refreshToken, getMe, logout as apiLogout } from '../api/endpoints'
import { coreAPI, moduleAPI, adminAPI } from '../api/client'

const useGenesisStore = create(
  persist(
    (set, get) => ({

      // ── Auth ────────────────────────────────────────────────────────────────
      token:    null,
      user:     null,
      authed:   false,

      login: async (username, password) => {
        // FIX: apiLogin() sends application/x-www-form-urlencoded as backend expects
        const res = await apiLogin(username, password)
        const { access_token, user } = res.data
        localStorage.setItem('genesis_token', access_token)
        set({ token: access_token, user, authed: true })
        return res.data
      },

      logout: () => {
        apiLogout().catch(() => {}) // best-effort server logout
        localStorage.removeItem('genesis_token')
        set({ token: null, user: null, authed: false, messages: [], stats: null })
      },

      // ── Stats ───────────────────────────────────────────────────────────────
      stats:         null,
      statsLoading:  false,

      fetchStats: async () => {
        if (get().statsLoading) return
        set({ statsLoading: true })
        try {
          const res = await coreAPI.stats()
          set({ stats: res.data })
        } catch { /* silent fail */ }
        finally { set({ statsLoading: false }) }
      },

      // ── Learn ───────────────────────────────────────────────────────────────
      learnLoading: false,
      learnResult:  null,

      learn: async (source, source_type = 'url') => {
        set({ learnLoading: true, learnResult: null })
        try {
          const res = await coreAPI.learn(source, source_type)
          set({ learnResult: res.data })
          return res.data
        } catch (e) {
          set({ learnResult: { error: e.response?.data?.detail || 'Learn failed' } })
        } finally {
          set({ learnLoading: false })
        }
      },

      // ── Chat ────────────────────────────────────────────────────────────────
      messages:    [{ role: 'system', content: 'GENESIS online  ↗  Gemma 3 27B loaded · KG ready · 3 modules active', ts: Date.now() }],
      streamText:  '',
      streaming:   false,
      chatModule:  'auto',

      setChatModule: (m)     => set({ chatModule: m }),
      clearMessages: ()      => set({ messages: [{ role: 'system', content: 'Session cleared.', ts: Date.now() }] }),
      addMessage:    (msg)   => set(s => ({ messages: [...s.messages, { ...msg, ts: Date.now() }] })),
      setStreamText: (text)  => set({ streamText: text }),
      setStreaming:  (bool)  => set({ streaming: bool }),

      // ── Modules ─────────────────────────────────────────────────────────────
      modules:        [],
      modulesLoading: false,

      fetchModules: async () => {
        set({ modulesLoading: true })
        try {
          const res = await moduleAPI.list()
          set({ modules: res.data })
        } catch { /* silent */ }
        finally { set({ modulesLoading: false }) }
      },

      toggleModule: async (id, enabled) => {
        // Optimistic update
        set(s => ({
          modules: s.modules.map(m => m.id === id ? { ...m, enabled } : m)
        }))
        try {
          await moduleAPI.toggle(id, enabled)
        } catch {
          // Revert on error
          set(s => ({
            modules: s.modules.map(m => m.id === id ? { ...m, enabled: !enabled } : m)
          }))
        }
      },

      // ── Knowledge Graph ──────────────────────────────────────────────────────
      kgData:     { nodes: [], links: [] },
      kgLoading:  false,
      kgMessages: [],

      fetchKG: async () => {
        set({ kgLoading: true })
        try {
          const res = await coreAPI.summarise()
          set({ kgData: res.data })
        } catch { /* silent */ }
        finally { set({ kgLoading: false }) }
      },

      addKGMessage: (msg) => set(s => ({ kgMessages: [...s.kgMessages, msg] })),
      clearKGMessages: () => set({ kgMessages: [] }),

      // ── Admin ────────────────────────────────────────────────────────────────
      adminHealth:   null,
      adminUsers:    [],
      adminLogs:     [],
      adminTraining: null,

      fetchHealth:   async () => { try { const r = await adminAPI.health();     set({ adminHealth:   r.data }) } catch {} },
      fetchUsers:    async () => { try { const r = await adminAPI.users();      set({ adminUsers:    r.data }) } catch {} },
      fetchLogs:     async () => { try { const r = await adminAPI.logs(150);    set({ adminLogs:     r.data }) } catch {} },
      fetchTraining: async () => { try { const r = await adminAPI.trainStatus();set({ adminTraining: r.data }) } catch {} },

      // ── Voice ────────────────────────────────────────────────────────────────
      transcript:  '',
      recording:   false,
      setTranscript: (t)    => set({ transcript: t }),
      setRecording:  (bool) => set({ recording: bool }),

      // ── UI ────────────────────────────────────────────────────────────────────
      cmdOpen:  false,
      openCmd:  () => set({ cmdOpen: true }),
      closeCmd: () => set({ cmdOpen: false }),
    }),
    {
      name:    'genesis-store',
      partialize: s => ({ token: s.token, user: s.user, authed: s.authed, messages: s.messages }),
    }
  )
)

export default useGenesisStore

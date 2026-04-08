// frontend/src/store/genesisStore.js — global app state
import { create } from 'zustand'
import * as api from '../api/endpoints'

const useGenesisStore = create((set, get) => ({
  // Auth
  token:    localStorage.getItem('genesis_token') || null,
  isAuthed: !!localStorage.getItem('genesis_token'),

  setToken: (token) => {
    localStorage.setItem('genesis_token', token)
    set({ token, isAuthed: true })
  },
  logout: () => {
    localStorage.removeItem('genesis_token')
    set({ token: null, isAuthed: false })
  },

  // Stats
  stats:     null,
  fetchStats: async () => {
    try {
      const { data } = await api.getStats()
      set({ stats: data })
    } catch (e) { console.error('fetchStats:', e) }
  },

  // Learning
  learnResult:  null,
  learnLoading: false,
  learnError:   null,
  learn: async (source) => {
    set({ learnLoading: true, learnError: null })
    try {
      const { data } = await api.learn(source)
      set({ learnResult: data, learnLoading: false })
      return data
    } catch (e) {
      set({ learnError: e.message, learnLoading: false })
    }
  },

  // Chat
  messages: [],
  addMessage: (role, content) =>
    set((s) => ({ messages: [...s.messages, { role, content, ts: Date.now() }] })),
  clearMessages: () => set({ messages: [] }),

  ask: async (query) => {
    get().addMessage('user', query)
    try {
      const { data } = await api.ask(query)
      get().addMessage('assistant', data.result)
      return data.result
    } catch (e) {
      get().addMessage('assistant', `Error: ${e.message}`)
    }
  },
}))

export default useGenesisStore

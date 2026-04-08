// frontend/src/store/moduleStore.js — per-module UI state
import { create } from 'zustand'
import * as api from '../api/endpoints'

const useModuleStore = create((set) => ({
  activeModule: 'm1',
  setModule: (m) => set({ activeModule: m }),

  // M1 outputs
  quizText:      '',
  flashcardText: '',
  studyPlan:     '',
  hypotheses:    '',
  connections:   '',
  gaps:          [],

  fetchQuiz: async (topic, n = 3) => {
    const { data } = await api.quiz(topic, n)
    set({ quizText: data.result })
  },
  fetchFlashcards: async (topic, n = 5) => {
    const { data } = await api.flashcards(topic, n)
    set({ flashcardText: data.result })
  },
  fetchStudyPlan: async (topic, duration) => {
    const { data } = await api.getStudyPlan(topic, duration)
    set({ studyPlan: data.result })
  },
  fetchHypotheses: async (topic) => {
    const { data } = await api.getHypotheses(topic)
    set({ hypotheses: data.result })
  },
  fetchConnections: async () => {
    const { data } = await api.getConnections()
    set({ connections: data.result })
  },
  fetchGaps: async (topic) => {
    const { data } = await api.getGaps(topic)
    set({ gaps: data.gaps || [] })
  },
}))

export default useModuleStore

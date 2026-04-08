// frontend/src/api/endpoints.js — typed API call wrappers
import client from './client'

// ── Auth ─────────────────────────────────────────────────
export const login = (username, password) =>
  client.post('/auth/login', { username, password })

// ── Learn / Ingest ───────────────────────────────────────
export const learn = (source) =>
  client.post('/core/learn', { source })

// ── Ask / Teach ──────────────────────────────────────────
export const ask = (query) =>
  client.post('/core/ask', { query })

export const teach = (query, level = 'intermediate') =>
  client.post('/core/teach', { query, level })

export const quiz = (query, n = 3, show_answers = false) =>
  client.post('/core/quiz', { query, n, show_answers })

export const flashcards = (query, n = 5) =>
  client.post('/core/flashcards', { query, n })

export const summarise = () =>
  client.post('/core/summarise')

// ── Route ────────────────────────────────────────────────
export const route = (query) =>
  client.post('/core/route', { query })

// ── Stats ────────────────────────────────────────────────
export const getStats = () =>
  client.get('/core/stats')

// ── Module operations ────────────────────────────────────
export const getConnections = () =>
  client.post('/modules/m1/connections')

export const getGaps = (query) =>
  client.post('/modules/m1/gaps', { query })

export const getStudyPlan = (query, duration = '2 weeks') =>
  client.post('/modules/m1/study-plan', { query }, { params: { duration } })

export const getHypotheses = (query) =>
  client.post('/modules/m1/hypotheses', { query })

export const compare = (topic_a, topic_b) =>
  client.post('/modules/m1/compare', null, { params: { topic_a, topic_b } })

// ── Panel ────────────────────────────────────────────────
export const getOverview = () =>
  client.get('/panel/overview')

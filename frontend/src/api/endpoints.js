// frontend/src/api/endpoints.js
// GENESIS — Typed API Call Wrappers
//
// Fixes applied:
//   • summarise() changed from POST → GET to match the fixed backend route
//   • Added getMe() for token validation on page load
//   • Added refreshToken() used by the store and axios interceptor
//   • Added login() returning both access_token and refresh_token

import client from './client'

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Log in with username + password.
 * Backend expects application/x-www-form-urlencoded (OAuth2 password flow).
 * Returns { access_token, refresh_token, token_type, is_admin }
 */
export const login = (username, password) => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  return client.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

/** Exchange a refresh token for a new access token. */
export const refreshToken = (refresh_token) =>
  client.post('/auth/refresh', { refresh_token })

/** Validate the stored token and return the current user's profile. */
export const getMe = () => client.get('/auth/me')

/** Log out (client-side token discard + optional server blacklist). */
export const logout = () => client.post('/auth/logout')


// ── Learn / Ingest ────────────────────────────────────────────────────────────

export const learn = (source) =>
  client.post('/core/learn', { source })


// ── Ask / Teach ───────────────────────────────────────────────────────────────

export const ask = (query) =>
  client.post('/core/ask', { query })

export const teach = (query, level = 'intermediate') =>
  client.post('/core/teach', { query, level })

export const quiz = (query, n = 3, show_answers = false) =>
  client.post('/core/quiz', { query, n, show_answers })

export const flashcards = (query, n = 5) =>
  client.post('/core/flashcards', { query, n })

/** Summarise the knowledge base — GET (was incorrectly POST in old code). */
export const summarise = () =>
  client.get('/core/summarise')


// ── Route ─────────────────────────────────────────────────────────────────────

export const route = (query) =>
  client.post('/core/route', { query })


// ── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = () => client.get('/core/stats')


// ── Module operations ─────────────────────────────────────────────────────────

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


// ── Panel ─────────────────────────────────────────────────────────────────────

export const getOverview = () => client.get('/panel/overview')

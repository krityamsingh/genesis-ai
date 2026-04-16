import axios from 'axios'

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('genesis_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Global 401 handler
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('genesis_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:   (username, password) => api.post('/auth/login',  { username, password }),
  refresh: ()                   => api.post('/auth/refresh'),
  logout:  ()                   => api.post('/auth/logout'),
  me:      ()                   => api.get ('/auth/me'),
}

// ── Core ──────────────────────────────────────────────────────────────────────
export const coreAPI = {
  /** Ingest a source (URL, PDF path, raw text) into the knowledge graph */
  learn:         (source, source_type = 'url') => api.post('/core/learn', { source, source_type }),

  /** Ask a question (non-streaming) */
  ask:           (query, module_hint = null)   => api.post('/core/query', { query, module_hint }),

  /** Auto-route a complex query to the best module */
  route:         (query)                       => api.post('/core/route', { query }),

  /** Stats for the dashboard */
  stats:         ()                            => api.get ('/core/stats'),

  /** Export training dataset */
  exportDataset: ()                            => api.post('/core/export-dataset'),

  /** Summarise knowledge graph */
  summarise:     ()                            => api.get ('/core/summarise'),
}

// ── Modules ───────────────────────────────────────────────────────────────────
export const moduleAPI = {
  list:          ()          => api.get  ('/modules'),
  toggle:        (id, state) => api.patch(`/modules/${id}`, { enabled: state }),
  info:          (id)        => api.get  (`/modules/${id}`),
}

// ── Knowledge Graph ───────────────────────────────────────────────────────────
export const kgAPI = {
  nodes:         ()      => api.get('/core/kg/nodes'),
  query:         (q)     => api.post('/core/kg/query', { query: q }),
  nodeInfo:      (id)    => api.get(`/core/kg/node/${id}`),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  health:        ()             => api.get  ('/admin/health'),
  users:         ()             => api.get  ('/admin/users'),
  createUser:    (data)         => api.post ('/admin/users', data),
  deleteUser:    (id)           => api.delete(`/admin/users/${id}`),
  logs:          (lines = 100)  => api.get  (`/admin/logs?lines=${lines}`),
  trainStatus:   ()             => api.get  ('/admin/training/status'),
  startTraining: (cfg)          => api.post ('/admin/training/start', cfg),
  backup:        ()             => api.post ('/admin/backup'),
  listBackups:   ()             => api.get  ('/admin/backups'),
  prompts:       ()             => api.get  ('/admin/prompts'),
  savePrompt:    (id, body)     => api.put  (`/admin/prompts/${id}`, body),
}

// ── Voice ─────────────────────────────────────────────────────────────────────
export const voiceAPI = {
  /** Send audio blob, get transcript */
  transcribe: (audioBlob) => {
    const fd = new FormData()
    fd.append('file', audioBlob, 'recording.webm')
    return api.post('/voice/transcribe', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  /** Get TTS audio URL */
  speak: (text, lang = 'en') => api.post('/voice/speak', { text, lang }, { responseType: 'blob' }),
}

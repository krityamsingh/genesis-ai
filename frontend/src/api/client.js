// frontend/src/api/client.js — UPDATED (MongoDB rebuild)
// Added: OTP endpoints, setup-name, conversations CRUD, login-history admin.
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('genesis_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      // Try token refresh before redirecting
      const refresh = localStorage.getItem('genesis_refresh')
      if (refresh && !err.config._retried) {
        err.config._retried = true
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh })
          localStorage.setItem('genesis_token', data.access_token)
          err.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(err.config)
        } catch {}
      }
      localStorage.removeItem('genesis_token')
      localStorage.removeItem('genesis_refresh')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:         (username, password) => {
    const form = new URLSearchParams({ username, password, grant_type: 'password' })
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  googleLogin:   ()                   => { window.location.href = '/api/v1/auth/google' },
  sendOtp:       (phone)              => api.post('/auth/otp/send',   { phone }),
  verifyOtp:     (phone, code)        => api.post('/auth/otp/verify', { phone, code }),
  setupName:     (display_name)       => api.post('/auth/setup-name', { display_name }),
  refresh:       (refresh_token)      => api.post('/auth/refresh',    { refresh_token }),
  logout:        ()                   => api.post('/auth/logout'),
  me:            ()                   => api.get ('/auth/me'),
}

// ── Conversations ─────────────────────────────────────────────────────────────
export const convAPI = {
  list:          ()             => api.get('/conversations/'),
  create:        (module)       => api.post('/conversations/', { module }),
  get:           (id)           => api.get(`/conversations/${id}`),
  delete:        (id)           => api.delete(`/conversations/${id}`),
  messages:      (id)           => api.get(`/conversations/${id}/messages`),
  sendMessage:   (id, content, module) => api.post(`/conversations/${id}/messages`, { content, module }),
}

// ── Core ──────────────────────────────────────────────────────────────────────
export const coreAPI = {
  learn:         (source, source_type = 'url') => api.post('/core/learn',  { source, source_type }),
  ask:           (query, module_hint = null)   => api.post('/core/ask',    { query, module_hint }),
  route:         (query)                       => api.post('/core/route',  { query }),
  stats:         ()                            => api.get ('/core/stats'),
  exportDataset: ()                            => api.post('/core/export-dataset'),
  summarise:     ()                            => api.get ('/core/summarise'),
}

// ── Modules ───────────────────────────────────────────────────────────────────
export const moduleAPI = {
  list:          ()          => api.get  ('/modules/'),
  toggle:        (id, state) => api.patch(`/modules/${id}`, { enabled: state }),
  info:          (id)        => api.get  (`/modules/${id}`),
}

// ── Knowledge Graph ───────────────────────────────────────────────────────────
export const kgAPI = {
  nodes:         ()  => api.get('/core/kg/nodes'),
  query:         (q) => api.post('/core/kg/query', { query: q }),
  nodeInfo:      (id)=> api.get(`/core/kg/node/${id}`),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  health:        ()             => api.get  ('/admin/health'),
  users:         ()             => api.get  ('/admin/users'),
  createUser:    (data)         => api.post ('/admin/users', data),
  deleteUser:    (id)           => api.delete(`/admin/users/${id}`),
  promoteUser:   (id)           => api.post (`/admin/users/${id}/promote`),
  demoteUser:    (id)           => api.post (`/admin/users/${id}/demote`),
  logs:          (lines = 200)  => api.get  (`/admin/logs?lines=${lines}`),
  trainStatus:   ()             => api.get  ('/admin/training/status'),
  startTraining: (cfg)          => api.post ('/admin/training/start', cfg),
  backup:        ()             => api.post ('/admin/backup'),
  listBackups:   ()             => api.get  ('/admin/backups'),
  prompts:       (n = 50)       => api.get  (`/admin/prompts?n=${n}`),
  clearPrompts:  ()             => api.delete('/admin/prompts'),
  savePrompt:    (id, body)     => api.put  (`/admin/prompts/${id}`, { body }),
  loginHistory:  (params = {})  => api.get  ('/admin/login-history', { params }),
  exportHistory: (params = {})  => `/api/v1/admin/login-history/export?${new URLSearchParams(params)}`,
}

// ── Voice ─────────────────────────────────────────────────────────────────────
export const voiceAPI = {
  transcribe: (audioBlob) => {
    const fd = new FormData()
    fd.append('audio', audioBlob, 'recording.webm')
    return api.post('/core/transcribe', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

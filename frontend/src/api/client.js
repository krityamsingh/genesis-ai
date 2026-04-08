// frontend/src/api/client.js — Axios instance with auth injection
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 60000,
})

// Attach Bearer token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('genesis_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handling
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('genesis_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client

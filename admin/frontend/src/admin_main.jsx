// admin/frontend/src/main.jsx — Admin panel entry point
import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminApp from './AdminApp'

// Minimal reset so the admin panel doesn't inherit stale browser styles
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f1f5f9; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
)

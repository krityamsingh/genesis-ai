import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import useGenesisStore from './store/genesisStore'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/Commandpalette'   // FIX: was ./components/CommandPalette (file is Commandpalette.jsx)

// Pages — import names match actual filenames (case-sensitive on Linux)
import Login      from './pages/login'      // FIX: was ./pages/Login
import Dashboard  from './pages/Dashboard'
import Chat       from './pages/Chat'
import Knowledge  from './pages/Knowledge'
import Modules    from './pages/Modules'
import Timeline   from './pages/Timeline'
import Voice      from './pages/Voice'
import Admin      from './pages/admin'       // FIX: was ./pages/Admin

// ── Auth guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { authed } = useGenesisStore()
  const location   = useLocation()
  if (!authed) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ── Shell layout (sidebar + content) ─────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg0)' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </main>
      <CommandPalette />
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const { authed, fetchStats, fetchModules } = useGenesisStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Prefetch on auth
  useEffect(() => {
    if (authed) {
      fetchStats()
      fetchModules()
    }
  }, [authed]) // eslint-disable-line

  // Redirect to dashboard if already authed and on /
  useEffect(() => {
    if (authed && location.pathname === '/') navigate('/dashboard', { replace: true })
  }, [authed, location.pathname]) // eslint-disable-line

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route path="/dashboard" element={<RequireAuth><Shell><Dashboard /></Shell></RequireAuth>} />
        <Route path="/chat"      element={<RequireAuth><Shell><Chat      /></Shell></RequireAuth>} />
        <Route path="/knowledge" element={<RequireAuth><Shell><Knowledge /></Shell></RequireAuth>} />
        <Route path="/modules"   element={<RequireAuth><Shell><Modules   /></Shell></RequireAuth>} />
        <Route path="/timeline"  element={<RequireAuth><Shell><Timeline  /></Shell></RequireAuth>} />
        <Route path="/voice"     element={<RequireAuth><Shell><Voice     /></Shell></RequireAuth>} />
        <Route path="/admin"     element={<RequireAuth><Shell><Admin     /></Shell></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={authed ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </div>
  )
}

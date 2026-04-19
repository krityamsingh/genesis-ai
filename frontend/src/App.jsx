// frontend/src/App.jsx — UPDATED (MongoDB rebuild)
// Added routes: /setup-name, /chat (ChatApp), /auth/callback updated.
// LoginPage, NameSetupPage, ChatApp are new Claude-style components.
import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import useGenesisStore from './store/genesisStore'
import AppShell from './components/AppShell'

// ── Lazy-load pages ───────────────────────────────────────────────────────────
const LoginPage     = lazy(() => import('./pages/LoginPage'))
const NameSetupPage = lazy(() => import('./pages/NameSetupPage'))
const AuthCallback  = lazy(() => import('./pages/AuthCallback'))
const ChatApp       = lazy(() => import('./pages/ChatApp'))
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Chat          = lazy(() => import('./pages/Chat'))
const Knowledge     = lazy(() => import('./pages/Knowledge'))
const Modules       = lazy(() => import('./pages/Modules'))
const Timeline      = lazy(() => import('./pages/Timeline'))
const Voice         = lazy(() => import('./pages/Voice'))
const Admin         = lazy(() => import('./pages/admin'))
const Settings      = lazy(() => import('./pages/Settings'))

function PageLoader() {
  return (
    <div style={{ padding: '24px' }}>
      {[80, 60, 100, 70].map((w, i) => (
        <div key={i} style={{
          height: 14, width: `${w}%`, borderRadius: 6,
          background: '#F0F0F0', marginBottom: 12,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

function RequireAuth({ children }) {
  const { authed } = useGenesisStore()
  const location   = useLocation()
  // Also check localStorage directly (for new useAuth hook users)
  const hasToken = !!localStorage.getItem('genesis_token')
  if (!authed && !hasToken) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireAdmin({ children }) {
  const { authed, user } = useGenesisStore()
  const location         = useLocation()
  if (!authed) return <Navigate to="/login" state={{ from: location }} replace />
  if (!user?.is_admin) return <Navigate to="/chat" replace />
  return children
}

function Protected({ children, adminOnly = false }) {
  const Guard = adminOnly ? RequireAdmin : RequireAuth
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </AppShell>
    </Guard>
  )
}

export default function App() {
  const { authed, fetchStats, fetchModules } = useGenesisStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    if (authed) {
      fetchStats().catch(() => {})
      fetchModules().catch(() => {})
    }
  }, [authed]) // eslint-disable-line

  // Redirect root to /chat (new default) or /login
  useEffect(() => {
    const hasToken = !!localStorage.getItem('genesis_token')
    if ((authed || hasToken) && location.pathname === '/') {
      navigate('/chat', { replace: true })
    }
  }, [authed, location.pathname]) // eslint-disable-line

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/setup-name" element={<Suspense fallback={<PageLoader />}><NameSetupPage /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={<PageLoader />}><AuthCallback /></Suspense>} />

        {/* Main chat (new Claude-style shell) */}
        <Route path="/chat" element={<Suspense fallback={<PageLoader />}><ChatApp /></Suspense>} />

        {/* Legacy protected routes (still accessible) */}
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/knowledge" element={<Protected><Knowledge /></Protected>} />
        <Route path="/modules"   element={<Protected><Modules /></Protected>} />
        <Route path="/timeline"  element={<Protected><Timeline /></Protected>} />
        <Route path="/voice"     element={<Protected><Voice /></Protected>} />
        <Route path="/settings"  element={<Protected><Settings /></Protected>} />
        <Route path="/admin"     element={<Protected adminOnly><Admin /></Protected>} />

        {/* Fallback */}
        <Route path="*" element={
          <Navigate to={authed || localStorage.getItem('genesis_token') ? '/chat' : '/login'} replace />
        } />
      </Routes>
    </div>
  )
}

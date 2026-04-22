// frontend/src/App.jsx — v3 UPGRADE
// Added routes for M7/M8/M9, code interpreter, agent runner
import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import useGenesisStore from './store/genesisStore'
import AppShell from './components/AppShell'
import './styles/design-system.css'

// ── Lazy pages ────────────────────────────────────────────────────────────────
const LoginPage        = lazy(() => import('./pages/LoginPage'))
const NameSetupPage    = lazy(() => import('./pages/NameSetupPage'))
const AuthCallback     = lazy(() => import('./pages/AuthCallback'))
const ChatApp          = lazy(() => import('./pages/ChatApp'))
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const Knowledge        = lazy(() => import('./pages/Knowledge'))
const Modules          = lazy(() => import('./pages/Modules'))
const Timeline         = lazy(() => import('./pages/Timeline'))
const Voice            = lazy(() => import('./pages/Voice'))
const Settings         = lazy(() => import('./pages/Settings'))
const Admin            = lazy(() => import('./pages/admin'))
const TrainingStudio   = lazy(() => import('./pages/TrainingStudio'))

function PageLoader() {
  return (
    <div style={{ padding: 32, maxWidth: 600, margin: '60px auto' }}>
      {[85, 65, 90, 55, 75].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: `${w}%`, marginBottom: 14 }} />
      ))}
    </div>
  )
}

function RequireAuth({ children }) {
  const { authed } = useGenesisStore()
  const location   = useLocation()
  const hasToken   = !!localStorage.getItem('genesis_token')
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
        <Route path="/login"        element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/setup-name"   element={<Suspense fallback={<PageLoader />}><NameSetupPage /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={<PageLoader />}><AuthCallback /></Suspense>} />

        {/* Primary chat (Claude-style) */}
        <Route path="/chat" element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><ChatApp /></Suspense>
          </RequireAuth>
        } />

        {/* Protected pages */}
        <Route path="/dashboard"  element={<Protected><Dashboard /></Protected>} />
        <Route path="/knowledge"  element={<Protected><Knowledge /></Protected>} />
        <Route path="/modules"    element={<Protected><Modules /></Protected>} />
        <Route path="/timeline"   element={<Protected><Timeline /></Protected>} />
        <Route path="/voice"      element={<Protected><Voice /></Protected>} />
        <Route path="/settings"   element={<Protected><Settings /></Protected>} />
        <Route path="/training"   element={<Protected><TrainingStudio /></Protected>} />
        <Route path="/admin"      element={<Protected adminOnly><Admin /></Protected>} />

        {/* Fallback */}
        <Route path="*" element={
          <Navigate to={authed || localStorage.getItem('genesis_token') ? '/chat' : '/login'} replace />
        } />
      </Routes>
    </div>
  )
}

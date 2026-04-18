import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import useGenesisStore from './store/genesisStore'
import AppShell from './components/AppShell'

// ── Lazy-load all pages for code splitting ────────────────────────────────────
const Login        = lazy(() => import('./pages/login'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Chat         = lazy(() => import('./pages/Chat'))
const Knowledge    = lazy(() => import('./pages/Knowledge'))
const Modules      = lazy(() => import('./pages/Modules'))
const Timeline     = lazy(() => import('./pages/Timeline'))
const Voice        = lazy(() => import('./pages/Voice'))
const Admin        = lazy(() => import('./pages/admin'))
const Settings     = lazy(() => import('./pages/Settings'))

// ── Skeleton page loader ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ padding: '24px', animation: 'pageFadeIn 300ms' }}>
      {[80, 60, 100, 70].map((w, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: '14px', width: `${w}%`, borderRadius: '6px', marginBottom: '12px' }}
        />
      ))}
    </div>
  )
}

// ── Auth guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { authed } = useGenesisStore()
  const location   = useLocation()
  if (!authed) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ── Admin guard ───────────────────────────────────────────────────────────────
function RequireAdmin({ children }) {
  const { authed, user } = useGenesisStore()
  const location         = useLocation()
  if (!authed)          return <Navigate to="/login" state={{ from: location }} replace />
  if (!user?.is_admin)  return <Navigate to="/dashboard" replace />
  return children
}

// ── Protected shell wrapper ───────────────────────────────────────────────────
function Protected({ children, adminOnly = false }) {
  const Guard = adminOnly ? RequireAdmin : RequireAuth
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </AppShell>
    </Guard>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const { authed, fetchStats, fetchModules } = useGenesisStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Prefetch global data on auth
  useEffect(() => {
    if (authed) {
      fetchStats().catch(() => {})
      fetchModules().catch(() => {})
    }
  }, [authed]) // eslint-disable-line

  // Redirect root to dashboard
  useEffect(() => {
    if (authed && location.pathname === '/') navigate('/dashboard', { replace: true })
  }, [authed, location.pathname]) // eslint-disable-line

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        } />
        <Route path="/auth/callback" element={
          <Suspense fallback={<PageLoader />}>
            <AuthCallback />
          </Suspense>
        } />

        {/* ── Protected routes ── */}
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/chat"      element={<Protected><Chat /></Protected>} />
        <Route path="/knowledge" element={<Protected><Knowledge /></Protected>} />
        <Route path="/modules"   element={<Protected><Modules /></Protected>} />
        <Route path="/timeline"  element={<Protected><Timeline /></Protected>} />
        <Route path="/voice"     element={<Protected><Voice /></Protected>} />
        <Route path="/settings"  element={<Protected><Settings /></Protected>} />

        {/* ── Admin-only routes ── */}
        <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={authed ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </div>
  )
}

// frontend/src/routes/routes_index.jsx
// NOTE: This is an alternative router file. The canonical one is routes/index.jsx.
// Kept for compatibility but points to the same fixed page paths.
import React, { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import PrivateRoute  from './PrivateRoute'
import Loader        from '../components/Loader'
import NotFound      from '../components/NotFound'

// FIX: All lazy imports corrected to ../pages/<file> with proper casing
const App        = lazy(() => import('../App'))
const Login      = lazy(() => import('../pages/login'))
const Dashboard  = lazy(() => import('../pages/Dashboard'))
const ModulePanel= lazy(() => import('../pages/Modules'))
const KnowledgeG = lazy(() => import('../pages/Knowledge'))
const Timeline   = lazy(() => import('../pages/Timeline'))
const VoiceInput = lazy(() => import('../pages/Voice'))

const wrap = (el) => <Suspense fallback={<Loader />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/login', element: wrap(<Login />) },
  {
    path: '/',
    element: <PrivateRoute>{wrap(<App />)}</PrivateRoute>,
    children: [
      { index: true,         element: wrap(<Dashboard />) },
      { path: 'modules',     element: wrap(<ModulePanel />) },
      { path: 'knowledge',   element: wrap(<KnowledgeG />) },
      { path: 'timeline',    element: wrap(<Timeline />) },
      { path: 'voice',       element: wrap(<VoiceInput />) },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export default router

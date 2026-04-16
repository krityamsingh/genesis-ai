// frontend/src/routes/index.jsx
import React, { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import PrivateRoute  from './PrivateRoute'
import Loader        from '../components/Loader'
import NotFound      from '../components/NotFound'

// FIX: All lazy imports corrected to ../pages/<file> with proper casing
const App        = lazy(() => import('../App'))
const Login      = lazy(() => import('../pages/login'))         // FIX: was ../Login
const Dashboard  = lazy(() => import('../pages/Dashboard'))     // FIX: was ../Dashboard
const ModulePanel= lazy(() => import('../pages/Modules'))       // FIX: was ../ModulePanel (component doesn't exist as page)
const KnowledgeG = lazy(() => import('../pages/Knowledge'))     // FIX: was ../KnowledgeGraph
const Timeline   = lazy(() => import('../pages/Timeline'))      // FIX: was ../Timeline
const VoiceInput = lazy(() => import('../pages/Voice'))         // FIX: was ../VoiceInput

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

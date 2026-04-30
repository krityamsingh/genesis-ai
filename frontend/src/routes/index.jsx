// frontend/src/routes/index.jsx
import React, { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import PrivateRoute  from './PrivateRoute'
import Loader        from '../components/Loader'
import NotFound      from '../components/NotFound'

const App        = lazy(() => import('../App'))
const Dashboard  = lazy(() => import('../pages/Dashboard'))
const ModulePanel= lazy(() => import('../pages/Modules'))
const KnowledgeG = lazy(() => import('../pages/Knowledge'))
const Timeline   = lazy(() => import('../pages/Timeline'))
const VoiceInput = lazy(() => import('../pages/Voice'))

const wrap = (el) => <Suspense fallback={<Loader />}>{el}</Suspense>

const router = createBrowserRouter([
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

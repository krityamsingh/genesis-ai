// frontend/src/routes/PrivateRoute.jsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'

export default function PrivateRoute({ children }) {
  const authed   = useGenesisStore((s) => s.authed)   // FIX: was s.isAuthed (doesn't exist)
  const location = useLocation()
  if (!authed) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

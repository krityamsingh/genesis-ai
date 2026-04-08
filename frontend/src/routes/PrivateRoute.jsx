// frontend/src/routes/PrivateRoute.jsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'

export default function PrivateRoute({ children }) {
  const isAuthed  = useGenesisStore((s) => s.isAuthed)
  const location  = useLocation()
  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

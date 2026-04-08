// frontend/src/routes/AdminRoute.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import { jwtDecode } from 'jwt-decode'

export default function AdminRoute({ children }) {
  const token = useGenesisStore((s) => s.token)
  try {
    const claims = token ? jwtDecode(token) : {}
    if (!claims.adm) return <Navigate to="/" replace />
  } catch {
    return <Navigate to="/login" replace />
  }
  return children
}

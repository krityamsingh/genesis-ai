// frontend/src/components/NotFound.jsx
import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
      <div className="text-8xl font-bold text-indigo-200">404</div>
      <h1 className="text-2xl font-semibold text-gray-800">Page not found</h1>
      <p className="text-gray-500 max-w-sm">This page doesn't exist in the GENESIS system.</p>
      <Link to="/" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
        Back to Dashboard
      </Link>
    </div>
  )
}

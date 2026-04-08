// frontend/src/components/Loader.jsx
import React from 'react'

export default function Loader({ size = 'md', text = 'Thinking…' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <svg className={`animate-spin text-indigo-600 ${sizes[size]}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}

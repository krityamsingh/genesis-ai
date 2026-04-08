// frontend/src/components/Button.jsx
import React from 'react'

export default function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, loading = false, className = '', ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variants = {
    primary:   'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  )
}

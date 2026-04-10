// frontend/src/components/Button.jsx
import React from 'react'

export default function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, loading = false, className = '', ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variants = {
    primary:   'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 focus:ring-indigo-500/50 shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-slate-800 text-slate-200 border border-white/5 hover:bg-slate-700 focus:ring-slate-500/50',
    danger:    'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 focus:ring-red-500/50',
    ghost:     'text-slate-400 hover:bg-white/5 focus:ring-white/10',
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

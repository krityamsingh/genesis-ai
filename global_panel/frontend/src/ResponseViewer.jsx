import React from 'react'

export default function ResponseViewer({ response, loading, module }) {
  if (loading) return (
    <div className="flex items-center gap-3 p-6 text-gray-400 text-sm">
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Processing via {module?.toUpperCase()}…
    </div>
  )

  if (!response) return (
    <div className="p-6 text-center text-gray-300 text-sm">Response will appear here</div>
  )

  return (
    <div className="space-y-2">
      {module && <div className="text-xs font-medium text-indigo-500 uppercase tracking-wide">{module} response</div>}
      <pre className="bg-gray-900 text-green-300 rounded-xl p-5 text-sm font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
        {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
      </pre>
    </div>
  )
}

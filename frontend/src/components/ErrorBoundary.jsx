// frontend/src/components/ErrorBoundary.jsx
import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-8">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

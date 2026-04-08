// frontend/src/hooks/useModule.js
import { useState, useCallback } from 'react'
import * as api from '../api/endpoints'

export function useModule() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState('')

  const call = useCallback(async (fn, ...args) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await fn(...args)
      const text = data.result ?? JSON.stringify(data)
      setResult(text)
      return text
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, result, call, setResult }
}

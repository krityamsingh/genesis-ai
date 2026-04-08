import React, { useState } from 'react'
import axios from 'axios'

export default function ComparePanel() {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  const runAll = async () => {
    setLoading(true); setResults({})
    const modules = ['m1','m2','m3','m4','m5','m6']
    const out = {}
    await Promise.all(modules.map(async (m) => {
      try {
        const { data } = await axios.post('/api/v1/core/route', { query: `[${m}] ${prompt}` })
        out[m] = typeof data.response === 'string' ? data.response : JSON.stringify(data.response)
      } catch (e) { out[m] = `Error: ${e.message}` }
    }))
    setResults(out); setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Compare Modules</h2>
      <div className="flex gap-3">
        <input value={prompt} onChange={e=>setPrompt(e.target.value)}
          placeholder="Prompt to compare across all modules…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
        <button onClick={runAll} disabled={loading || !prompt.trim()}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Running…' : 'Run All'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(results).map(([m, r]) => (
          <div key={m} className="bg-white rounded-xl p-4 border">
            <div className="font-semibold text-indigo-700 mb-2 text-sm">{m.toUpperCase()}</div>
            <p className="text-sm text-gray-700 line-clamp-6 whitespace-pre-wrap">{r}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

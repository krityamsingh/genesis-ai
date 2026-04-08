import React, { useState } from 'react'
import axios from 'axios'

export default function PromptPlayground() {
  const [prompt,   setPrompt]   = useState('')
  const [module,   setModule]   = useState('m1')
  const [response, setResponse] = useState('')
  const [loading,  setLoading]  = useState(false)

  const run = async () => {
    setLoading(true); setResponse('')
    try {
      const { data } = await axios.post('/api/v1/core/route', { query: prompt })
      setResponse(typeof data.response === 'string' ? data.response : JSON.stringify(data.response, null, 2))
    } catch (e) {
      setResponse(`Error: ${e.response?.data?.detail || e.message}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Prompt Playground</h2>
      <textarea rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)}
        placeholder="Enter prompt…"
        className="w-full border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
      <div className="flex gap-3">
        <select value={module} onChange={e=>setModule(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          {['m1','m2','m3','m4','m5','m6'].map(m=><option key={m}>{m}</option>)}
        </select>
        <button onClick={run} disabled={loading || !prompt.trim()}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Running…' : 'Run'}
        </button>
      </div>
      {response && (
        <pre className="bg-gray-900 text-green-400 rounded-xl p-5 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
          {response}
        </pre>
      )}
    </div>
  )
}

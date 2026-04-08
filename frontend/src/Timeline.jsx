// frontend/src/Timeline.jsx — M4 history/future UI
import React, { useState } from 'react'
import Card   from './components/Card'
import Button from './components/Button'
import Loader from './components/Loader'
import * as api from './api/endpoints'

export default function Timeline() {
  const [topic,  setTopic]  = useState('')
  const [mode,   setMode]   = useState('history')  // history | future
  const [output, setOutput] = useState('')
  const [loading,setLoading]= useState(false)

  const run = async () => {
    if (!topic.trim()) return
    setLoading(true); setOutput('')
    try {
      const { data } = await api.route(`${mode} of ${topic}`)
      setOutput(typeof data.response === 'string' ? data.response : JSON.stringify(data.response, null, 2))
    } catch (e) {
      setOutput(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Timeline</h1>
      <Card title="📅 Time Reconstruct — M4">
        <div className="space-y-4">
          <div className="flex gap-3">
            {['history','future'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  mode === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>{m === 'history' ? '📜 History' : '🔮 Future'}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              placeholder={mode === 'history' ? 'Topic to reconstruct…' : 'Topic to project…'}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Button onClick={run} loading={loading}>Generate</Button>
          </div>
          {loading
            ? <Loader text={mode === 'history' ? 'Reconstructing…' : 'Projecting…'} />
            : output && <pre className="text-sm whitespace-pre-wrap text-gray-800 font-mono bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">{output}</pre>
          }
        </div>
      </Card>
    </div>
  )
}

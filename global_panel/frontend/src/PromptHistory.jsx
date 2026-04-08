import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function PromptHistory() {
  const [logs, setLogs] = useState([])
  useEffect(() => {
    axios.get('/api/v1/admin/prompts').then(({ data }) => setLogs(data)).catch(console.error)
  }, [])
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Prompt History</h2>
      {logs.length === 0 ? <p className="text-gray-400">No prompts logged yet.</p> : (
        <div className="space-y-3">
          {logs.map((l, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border text-sm space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span className="font-medium text-indigo-600">[{l.module}]</span>
                <span>{l.latency_ms?.toFixed(0)}ms</span>
              </div>
              <p className="text-gray-700 truncate">{l.prompt}</p>
              <p className="text-gray-500 text-xs truncate">{l.response}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

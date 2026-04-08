import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function ModelMonitor({ token }) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    axios.get('/api/v1/admin/model', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setInfo(data)).catch(console.error)
  }, [token])
  if (!info) return <div className="p-4 text-gray-500">Loading…</div>
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Model</h2>
      {Object.entries(info).map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm border-b py-2">
          <span className="text-gray-500">{k}</span>
          <span className="font-mono text-gray-900">{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

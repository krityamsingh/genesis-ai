import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function SystemHealth({ token }) {
  const [health, setHealth] = useState(null)
  useEffect(() => {
    axios.get('/api/v1/admin/health', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setHealth(data)).catch(console.error)
  }, [token])

  if (!health) return <div className="p-4 text-gray-500">Loading health…</div>

  const color = health.overall === 'ok' ? 'text-green-600' : 'text-yellow-600'
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">System Health — <span className={color}>{health.overall}</span></h2>
      {Object.entries(health).filter(([k]) => k !== 'overall' && k !== 'timestamp').map(([k, v]) => (
        <div key={k} className="flex justify-between py-2 border-b text-sm">
          <span className="text-gray-600 font-medium">{k}</span>
          <span className={v === 'ok' || v?.startsWith('ok') ? 'text-green-600' : 'text-red-500'}>{v}</span>
        </div>
      ))}
    </div>
  )
}

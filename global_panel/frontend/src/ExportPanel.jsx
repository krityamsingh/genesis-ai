import React, { useState } from 'react'
import axios from 'axios'

export default function ExportPanel() {
  const [data, setData] = useState('')
  const [loading, setLoading] = useState(false)

  const exportKG = async () => {
    setLoading(true)
    try {
      const { data: res } = await axios.get('/api/v1/panel/kg/export')
      setData(res.json)
    } finally { setLoading(false) }
  }

  const download = () => {
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'genesis_kg_export.json'; a.click()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Export Knowledge</h2>
      <div className="flex gap-3">
        <button onClick={exportKG} disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Exporting…' : 'Export KG to JSON'}
        </button>
        {data && <button onClick={download}
          className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          ⬇ Download
        </button>}
      </div>
      {data && <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs font-mono max-h-80 overflow-y-auto">{data.slice(0,2000)}…</pre>}
    </div>
  )
}

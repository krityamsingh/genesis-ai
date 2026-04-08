import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function ModuleManager({ token }) {
  const [modules, setModules] = useState([])

  const load = () => axios.get('/api/v1/admin/modules', { headers: { Authorization: `Bearer ${token}` } })
    .then(({ data }) => setModules(data)).catch(console.error)

  useEffect(() => { load() }, [token])

  const toggle = async (key, enabled) => {
    await axios.put(`/api/v1/admin/modules/${key}`, null,
      { params: { enabled }, headers: { Authorization: `Bearer ${token}` } })
    load()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Module States</h2>
      {modules.map((m) => (
        <div key={m.module_key} className="flex items-center justify-between border-b py-2">
          <span className="font-medium text-sm">{m.module_key}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={m.enabled}
              onChange={(e) => toggle(m.module_key, e.target.checked)}
              className="sr-only peer"/>
            <div className="w-9 h-5 bg-gray-200 peer-checked:bg-indigo-600 rounded-full transition-colors"/>
          </label>
        </div>
      ))}
    </div>
  )
}

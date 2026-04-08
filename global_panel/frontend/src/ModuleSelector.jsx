import React from 'react'
import { MODULE_LIST } from '../../../frontend/src/types/module.types'

export default function ModuleSelector({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODULE_LIST.map((m) => (
        <button key={m.key} onClick={() => onChange(m.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            active===m.key ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
          }`}>
          {m.icon} {m.name}
        </button>
      ))}
    </div>
  )
}

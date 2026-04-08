import React, { useState } from 'react'
import PromptPlayground from './PromptPlayground'
import PromptHistory    from './PromptHistory'
import BenchmarkPanel   from './BenchmarkPanel'
import ComparePanel     from './ComparePanel'
import ExportPanel      from './ExportPanel'

const TABS = ['Playground','History','Benchmark','Compare','Export']

export default function GlobalPanel() {
  const [tab, setTab] = useState('Playground')
  const map = { Playground: PromptPlayground, History: PromptHistory,
                Benchmark: BenchmarkPanel, Compare: ComparePanel, Export: ExportPanel }
  const Panel = map[tab]
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-3 flex items-center gap-6">
        <span className="font-bold text-indigo-700">⚡ GENESIS Panel</span>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${
              tab===t ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>{t}</button>
        ))}
      </nav>
      <main className="p-8 max-w-5xl mx-auto"><Panel /></main>
    </div>
  )
}

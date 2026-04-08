// frontend/src/ModulePanel.jsx — M1–M6 selector + output panel
import React, { useState } from 'react'
import Card   from './components/Card'
import Button from './components/Button'
import Loader from './components/Loader'
import { MODULE_LIST } from './types/module.types'
import useModuleStore   from './store/moduleStore'
import * as api         from './api/endpoints'

export default function ModulePanel() {
  const { activeModule, setModule } = useModuleStore()
  const [topic,   setTopic]   = useState('')
  const [output,  setOutput]  = useState('')
  const [loading, setLoading] = useState(false)
  const [action,  setAction]  = useState('teach')

  const ACTIONS = {
    m1: [
      { id: 'teach',      label: 'Teach' },
      { id: 'quiz',       label: 'Quiz' },
      { id: 'flashcards', label: 'Flashcards' },
      { id: 'hypotheses', label: 'Hypotheses' },
      { id: 'study_plan', label: 'Study Plan' },
      { id: 'gaps',       label: 'Gaps' },
      { id: 'connections',label: 'Connections' },
    ],
  }

  const run = async () => {
    if (!topic.trim() && action !== 'connections') return
    setLoading(true); setOutput('')
    try {
      let res
      if (action === 'teach')       res = await api.teach(topic)
      else if (action === 'quiz')   res = await api.quiz(topic)
      else if (action === 'flashcards') res = await api.flashcards(topic)
      else if (action === 'hypotheses') res = await api.getHypotheses(topic)
      else if (action === 'study_plan') res = await api.getStudyPlan(topic)
      else if (action === 'gaps')       res = await api.getGaps(topic)
      else if (action === 'connections') res = await api.getConnections()
      setOutput(res?.data?.result ?? JSON.stringify(res?.data, null, 2))
    } catch (e) {
      setOutput(`Error: ${e.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const currentActions = ACTIONS[activeModule] || []

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Modules</h1>

      {/* Module selector */}
      <div className="grid grid-cols-6 gap-3">
        {MODULE_LIST.map((m) => (
          <button
            key={m.key}
            onClick={() => { setModule(m.key); setOutput('') }}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
              activeModule === m.key
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-xs font-medium mt-1 text-center text-gray-700">{m.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Controls */}
        <Card title={`${MODULE_LIST.find(m => m.key === activeModule)?.icon} ${MODULE_LIST.find(m => m.key === activeModule)?.name}`}>
          <div className="space-y-4">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic or query…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {currentActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentActions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      action === a.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                    }`}
                  >{a.label}</button>
                ))}
              </div>
            )}
            <Button onClick={run} loading={loading} className="w-full">Run</Button>
          </div>
        </Card>

        {/* Output */}
        <Card title="Output">
          {loading
            ? <Loader text="Processing…" />
            : output
              ? <pre className="text-sm whitespace-pre-wrap text-gray-800 font-mono bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">{output}</pre>
              : <p className="text-sm text-gray-400 text-center py-8">Output will appear here</p>
          }
        </Card>
      </div>
    </div>
  )
}

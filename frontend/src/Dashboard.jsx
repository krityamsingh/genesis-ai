// frontend/src/Dashboard.jsx
import React, { useState } from 'react'
import Card   from './components/Card'
import Button from './components/Button'
import Loader from './components/Loader'
import useGenesisStore from './store/genesisStore'

export default function Dashboard() {
  const { stats, learn, learnLoading, messages, ask } = useGenesisStore()
  const [source,  setSource]  = useState('')
  const [query,   setQuery]   = useState('')
  const [learnOk, setLearnOk] = useState(null)

  const handleLearn = async () => {
    const res = await learn(source)
    if (res) { setLearnOk(res); setSource('') }
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    await ask(query)
    setQuery('')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">GENESIS self-learning AI system</p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Docs',   value: stats.kg?.total_docs ?? 0,          icon: '📚' },
            { label: 'Engine',       value: stats.engine?.split('/').pop() ?? '-', icon: '🤖' },
            { label: 'Memory Turns', value: stats.memory?.buffer_turns ?? 0,    icon: '💬' },
            { label: 'Routes',       value: stats.router?.total_routed ?? 0,    icon: '🔀' },
          ].map(({ label, value, icon }) => (
            <Card key={label} className="text-center">
              <div className="text-3xl mb-1">{icon}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Learn */}
        <Card title="📥 Learn" subtitle="Feed any URL, PDF path, or raw text">
          <div className="space-y-3">
            <textarea
              rows={3}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="https://... or paste text…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Button onClick={handleLearn} loading={learnLoading} disabled={!source.trim()}>
              Learn
            </Button>
            {learnOk && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✅ {learnOk.knowledge_items_stored} items stored · {learnOk.domain}
              </div>
            )}
          </div>
        </Card>

        {/* Ask */}
        <Card title="💬 Ask" subtitle="Ask questions from stored knowledge">
          <div className="space-y-3 flex flex-col h-64">
            <div className="flex-1 overflow-y-auto space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Button type="submit" size="sm">Ask</Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}

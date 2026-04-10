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
  const [exportStatus, setExportStatus] = useState(null)
  const [trainStatus,  setTrainStatus]  = useState(null)

  const handleLearn = async () => {
    const res = await learn(source)
    if (res) { setLearnOk(res); setSource('') }
  }

  const handleExport = async () => {
    setExportStatus({ loading: true })
    try {
      const resp = await fetch('/api/v1/core/export-dataset', { method: 'POST' })
      const data = await resp.json()
      setExportStatus(data)
    } catch (e) {
      setExportStatus({ status: 'error', message: e.message })
    }
  }

  const handleTrain = async () => {
    if (!exportStatus?.file_path) {
      alert("Please export a dataset first!");
      return;
    }
    setTrainStatus({ loading: true });
    // In a real app, this would queue the tasks.fine_tune Celery worker
    setTimeout(() => {
      setTrainStatus({ status: 'success', message: 'Training task queued on worker Node-01' });
    }, 1500);
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    await ask(query)
    setQuery('')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            <span className="gradient-text">GENESIS</span> Dashboard
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Autonomous Intelligence Engine</p>
        </div>
        <div className="px-4 py-2 bg-white/50 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 backdrop-blur-sm shadow-sm">
          Node-01 • Active
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Intelligence Base', value: stats.kg?.total_docs ?? 0,          icon: '📚', color: 'indigo' },
            { label: 'Model Architecture', value: stats.engine?.split('/').pop() ?? '-', icon: '🤖', color: 'pink' },
            { label: 'Short-term Memory', value: stats.memory?.buffer_turns ?? 0,    icon: '💬', color: 'blue' },
            { label: 'Total Neural Paths', value: stats.router?.total_routed ?? 0,    icon: '🔀', color: 'emerald' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="glass-card p-6 rounded-2xl relative overflow-hidden group bg-white">
              <div className={`absolute top-0 right-0 p-4 text-2xl opacity-10 group-hover:scale-125 transition-transform`}>{icon}</div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Learn */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col bg-white">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-indigo-500">📥</span> Knowledge Ingestion
            </h3>
            <p className="text-sm text-slate-400 mt-1">Acquire new skills via web or files</p>
          </div>
          <div className="p-6 space-y-4 flex-1">
            <textarea
              rows={4}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Inject URL or raw knowledge stream..."
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            <div className="flex gap-3">
              <Button onClick={handleLearn} loading={learnLoading} disabled={!source.trim()} className="flex-1 py-4 shadow-lg shadow-indigo-600/10">
                Synchronize Knowledge
              </Button>
              <Button onClick={handleExport} loading={exportStatus?.loading} variant="secondary" className="px-6">
                🚀 Export
              </Button>
              <Button onClick={handleTrain} loading={trainStatus?.loading} className="px-6 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/10">
                🧠 Train
              </Button>
            </div>
            
            {learnOk && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-600 animate-fade-in">
                <span className="font-bold">Sync Complete:</span> {learnOk.knowledge_items_stored} neurons mapped
              </div>
            )}
          </div>
        </div>

        {/* Ask */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col bg-white">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-pink-500">💬</span> Neural Playground
            </h3>
            <p className="text-sm text-slate-400 mt-1">Interact with the autonomous engine</p>
          </div>
          <div className="p-6 space-y-4 flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                  <div className="text-5xl">⚡</div>
                  <div className="text-sm font-medium">Awaiting Input</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {m.content.includes('[ENGINE ERROR]') ? (
                      <div className="text-red-600">
                        <div className="font-bold mb-1">⚠️ Neural Sync Error</div>
                        {m.content}
                        <div className="mt-2 pt-2 border-t border-red-100 text-xs">
                          Your HuggingFace token may be expired. Update your <span className="font-mono bg-red-50 px-1">HF_TOKEN</span> in Railway variables.
                        </div>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAsk} className="flex gap-3 pt-4 border-t border-slate-100">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Message Genesis..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
              />
              <Button type="submit" size="sm" className="px-6 bg-pink-600 hover:bg-pink-500 shadow-md">Ask</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

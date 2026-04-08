// frontend/src/KnowledgeGraph.jsx — KG stats and search
import React, { useState, useEffect } from 'react'
import Card   from './components/Card'
import Button from './components/Button'
import Loader from './components/Loader'
import { getStats } from './api/endpoints'
import * as api from './api/endpoints'

export default function KnowledgeGraph() {
  const [stats,   setStats]   = useState(null)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getStats().then(({ data }) => setStats(data)).catch(console.error)
  }, [])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const { data } = await api.ask(query)   // re-uses M1 ask for KG search
      setResults([data.result])
    } catch (e) {
      setResults([`Error: ${e.message}`])
    } finally {
      setLoading(false)
    }
  }

  const kgStats = stats?.kg || {}

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Knowledge Graph</h1>

      {/* KG stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-600">{kgStats.total_docs ?? '—'}</div>
            <div className="text-sm text-gray-500 mt-1">Total Documents</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{kgStats.backend ?? '—'}</div>
            <div className="text-sm text-gray-500 mt-1">Backend</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              {Object.keys(kgStats.collections || {}).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Collections</div>
          </div>
        </Card>
      </div>

      {/* Collections breakdown */}
      {kgStats.collections && (
        <Card title="Collections">
          <div className="space-y-2">
            {Object.entries(kgStats.collections).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${Math.min((count / (kgStats.total_docs || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <Card title="🔍 Search Knowledge">
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Search stored knowledge…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Button onClick={search} loading={loading}>Search</Button>
          </div>
          {loading ? <Loader size="sm" text="Searching…" /> : (
            results.map((r, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap">{r}</div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

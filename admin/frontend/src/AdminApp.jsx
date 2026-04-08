import React, { useState } from 'react'
import AdminLogin    from './AdminLogin'
import SystemHealth  from './SystemHealth'
import ModelMonitor  from './ModelMonitor'
import ModuleManager from './ModuleManager'
import UserManager   from './UserManager'
import LogsViewer    from './LogsViewer'

const TABS = ['Health','Model','Modules','Users','Logs']

export default function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem('genesis_admin_token') || '')
  const [tab,   setTab]   = useState('Health')

  if (!token) return <AdminLogin onLogin={setToken} />

  const panel = { Health: SystemHealth, Model: ModelMonitor, Modules: ModuleManager,
                  Users: UserManager, Logs: LogsViewer }[tab]
  const Panel = panel

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-48 bg-gray-900 flex flex-col p-4 space-y-1">
        <div className="text-white font-bold px-3 py-3 mb-2">⚡ Admin</div>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              tab===t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}>{t}</button>
        ))}
        <div className="flex-1"/>
        <button onClick={() => { localStorage.removeItem('genesis_admin_token'); setToken('') }}
          className="text-xs text-gray-500 hover:text-gray-300 px-3 py-2">Logout</button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Panel token={token} />
      </main>
    </div>
  )
}

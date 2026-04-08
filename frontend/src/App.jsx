// frontend/src/App.jsx — shell layout with sidebar nav
import React, { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useGenesisStore from './store/genesisStore'

const NAV = [
  { to: '/',         label: 'Dashboard',  icon: '🏠' },
  { to: '/modules',  label: 'Modules',    icon: '🧩' },
  { to: '/knowledge',label: 'Knowledge',  icon: '🗂️' },
  { to: '/timeline', label: 'Timeline',   icon: '📅' },
  { to: '/voice',    label: 'Voice',      icon: '🎙️' },
]

export default function App() {
  const { logout, fetchStats } = useGenesisStore()
  const navigate = useNavigate()

  useEffect(() => { fetchStats() }, [fetchStats])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col">
        <div className="px-6 py-5">
          <span className="text-white text-xl font-bold tracking-tight">⚡ GENESIS</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ` +
                (isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')
              }
            >
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-300 px-3 py-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

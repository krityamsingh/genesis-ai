import React, { useState } from 'react'
import axios from 'axios'

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setError('')
    try {
      const { data } = await axios.post('/api/v1/admin/login', null,
        { params: { username, password } })
      localStorage.setItem('genesis_admin_token', data.access_token)
      onLogin(data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">⚡ GENESIS Admin</h1>
        <form onSubmit={submit} className="space-y-4">
          <input value={username} onChange={e=>setUsername(e.target.value)}
            placeholder="Username" className="w-full border rounded-lg px-3 py-2 text-sm"/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Password" className="w-full border rounded-lg px-3 py-2 text-sm"/>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium">
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

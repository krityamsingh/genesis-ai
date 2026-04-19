// frontend/src/hooks/useConversations.js — NEW FILE
// Fetches conversation list, creates new conversations, manages active ID.

import { useState, useCallback, useEffect } from 'react'

const API_BASE = '/api/v1'

export default function useConversations(authHeaders, authed) {
  const [conversations,   setConversations]   = useState([])
  const [activeConvId,    setActiveConvId]    = useState(null)
  const [messages,        setMessages]        = useState([])
  const [loadingConvs,    setLoadingConvs]    = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const fetchConversations = useCallback(async () => {
    if (!authed) return
    setLoadingConvs(true)
    try {
      const res = await fetch(`${API_BASE}/conversations/`, { headers: authHeaders() })
      if (res.ok) setConversations(await res.json())
    } catch {}
    finally { setLoadingConvs(false) }
  }, [authed]) // eslint-disable-line

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const createConversation = async (module = 'core') => {
    const res = await fetch(`${API_BASE}/conversations/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ module }),
    })
    if (!res.ok) throw new Error('Failed to create conversation')
    const conv = await res.json()
    setConversations(prev => [conv, ...prev])
    setActiveConvId(conv.id)
    setMessages([])
    return conv
  }

  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        headers: authHeaders(),
      })
      if (res.ok) setMessages(await res.json())
    } catch {}
    finally { setLoadingMessages(false) }
  }, []) // eslint-disable-line

  const selectConversation = (convId) => {
    setActiveConvId(convId)
    fetchMessages(convId)
  }

  const sendMessage = async (convId, content, module) => {
    const res = await fetch(`${API_BASE}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, module }),
    })
    if (!res.ok) throw new Error('Failed to send message')
    const data = await res.json()

    setMessages(prev => [
      ...prev,
      data.user_message,
      data.assistant_message,
    ])

    // Update conversation list (title + last_message_at)
    setConversations(prev =>
      prev.map(c => c.id === convId
        ? { ...c, last_message_at: data.assistant_message.created_at }
        : c
      ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
    )

    return data
  }

  const deleteConversation = async (convId) => {
    await fetch(`${API_BASE}/conversations/${convId}`, {
      method: 'DELETE', headers: authHeaders(),
    })
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeConvId === convId) {
      setActiveConvId(null)
      setMessages([])
    }
  }

  return {
    conversations,
    activeConvId,
    messages,
    loadingConvs,
    loadingMessages,
    createConversation,
    selectConversation,
    sendMessage,
    deleteConversation,
    refreshConversations: fetchConversations,
  }
}

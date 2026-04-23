// frontend/src/hooks/useConversations.js — v3 UPGRADE
// Full CRUD for conversations + message sending + message history
import { useState, useCallback, useRef } from 'react'

const BASE = '/api/v1'

export default function useConversations(authHeaders, authed) {
  const [conversations,    setConversations]   = useState([])
  const [activeConvId,     setActiveConvId]    = useState(null)
  const [messages,         setMessages]        = useState([])
  const [loadingConvs,     setLoadingConvs]    = useState(false)
  const [loadingMessages,  setLoadingMessages] = useState(false)
  const loadedRef = useRef(false)

  // Load all conversations
  const loadConversations = useCallback(async () => {
    if (!authed) return
    setLoadingConvs(true)
    try {
      const res = await fetch(`${BASE}/conversations`, { headers: authHeaders })
      if (!res.ok) return
      const data = await res.json()
      setConversations(Array.isArray(data) ? data : data.conversations || [])
    } catch (e) {
      console.error('loadConversations:', e)
    } finally {
      setLoadingConvs(false)
    }
  }, [authed, authHeaders])

  // Lazy-load on first call
  const ensureLoaded = useCallback(async () => {
    if (!loadedRef.current && authed) {
      loadedRef.current = true
      await loadConversations()
    }
  }, [authed, loadConversations])

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId) => {
    setLoadingMessages(true)
    setMessages([])
    try {
      const res = await fetch(`${BASE}/conversations/${convId}/messages`, { headers: authHeaders })
      if (!res.ok) return
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : data.messages || [])
    } catch (e) {
      console.error('loadMessages:', e)
    } finally {
      setLoadingMessages(false)
    }
  }, [authHeaders])

  // Create a new conversation
  const createConversation = useCallback(async (module = 'core') => {
    await ensureLoaded()
    const res = await fetch(`${BASE}/conversations`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New conversation', module }),
    })
    if (!res.ok) throw new Error(`Failed to create: ${res.status}`)
    const conv = await res.json()
    setConversations(prev => [conv, ...prev])
    setActiveConvId(conv.id)
    setMessages([])
    return conv
  }, [authHeaders, ensureLoaded])

  // Select and load a conversation
  const selectConversation = useCallback(async (convId) => {
    await ensureLoaded()
    setActiveConvId(convId)
    await loadMessages(convId)
  }, [ensureLoaded, loadMessages])

  // Send a message and append both sides
  const sendMessage = useCallback(async (convId, content, module = 'core') => {
    const userMsg = {
      id:         `tmp_${Date.now()}`,
      role:       'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch(`${BASE}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, role: 'user', module }),
      })
      if (!res.ok) throw new Error(`Send failed: ${res.status}`)
      const data = await res.json()

      // Replace temp user msg + add AI response
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== userMsg.id)
        const msgs = data.messages || (data.user_message && data.ai_message
          ? [data.user_message, data.ai_message]
          : data.message ? [data.message] : [])
        return [...withoutTemp, ...msgs]
      })

      // Update conversation in list (title, last_message_at)
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, last_message_at: new Date().toISOString(), title: c.title === 'New conversation' ? content.slice(0, 50) : c.title }
          : c
      ))

      return data
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      throw e
    }
  }, [authHeaders])

  // Delete a conversation
  const deleteConversation = useCallback(async (convId) => {
    try {
      await fetch(`${BASE}/conversations/${convId}`, { method: 'DELETE', headers: authHeaders })
    } catch {}
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeConvId === convId) {
      setActiveConvId(null)
      setMessages([])
    }
  }, [authHeaders, activeConvId])

  // On auth, kick off load
  useState(() => { if (authed) ensureLoaded() })

  return {
    conversations, activeConvId, messages,
    loadingConvs, loadingMessages,
    createConversation, selectConversation,
    sendMessage, deleteConversation,
    loadConversations,
  }
}

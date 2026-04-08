// frontend/src/hooks/useVoice.js — browser MediaRecorder + streaming to backend
import { useState, useRef, useCallback } from 'react'
import client from '../api/client'

export function useVoice() {
  const [recording,    setRecording]    = useState(false)
  const [transcript,   setTranscript]   = useState('')
  const [processing,   setProcessing]   = useState(false)
  const mediaRecorder  = useRef(null)
  const chunks         = useRef([])

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunks.current = []
    mediaRecorder.current = new MediaRecorder(stream)
    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data)
    mediaRecorder.current.start()
    setRecording(true)
  }, [])

  const stop = useCallback(async () => {
    return new Promise((resolve) => {
      mediaRecorder.current.onstop = async () => {
        setRecording(false)
        setProcessing(true)
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const form = new FormData()
        form.append('file', blob, 'recording.webm')
        try {
          const { data } = await client.post('/voice/transcribe', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          setTranscript(data.text || '')
          resolve(data.text || '')
        } catch (e) {
          console.error('Voice transcription error:', e)
          resolve('')
        } finally {
          setProcessing(false)
        }
      }
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach((t) => t.stop())
    })
  }, [])

  return { recording, transcript, processing, start, stop, setTranscript }
}

// frontend/src/VoiceInput.jsx — voice recording + M1 learn from transcript
import React, { useState } from 'react'
import Card   from './components/Card'
import Button from './components/Button'
import { useVoice } from './hooks/useVoice'
import { learn }    from './api/endpoints'

export default function VoiceInput() {
  const { recording, transcript, processing, start, stop, setTranscript } = useVoice()
  const [learned, setLearned] = useState(null)
  const [learnLoading, setLearnLoading] = useState(false)

  const toggle = async () => {
    if (recording) await stop()
    else await start()
  }

  const learnTranscript = async () => {
    if (!transcript.trim()) return
    setLearnLoading(true)
    try {
      const { data } = await learn(transcript)
      setLearned(data)
    } finally {
      setLearnLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Voice Input</h1>
      <Card title="🎙️ Voice to Knowledge">
        <div className="space-y-5">
          <div className="flex justify-center">
            <button
              onClick={toggle}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all ${
                recording
                  ? 'bg-red-500 text-white animate-pulse scale-110'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {recording ? '⏹' : '🎙️'}
            </button>
          </div>
          <p className="text-center text-sm text-gray-500">
            {recording ? 'Recording… click to stop' : processing ? 'Transcribing…' : 'Click to start recording'}
          </p>

          {transcript && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Transcript</label>
              <textarea
                rows={5}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Button onClick={learnTranscript} loading={learnLoading} className="w-full">
                Learn from Transcript
              </Button>
            </div>
          )}

          {learned && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              ✅ Learned {learned.knowledge_items_stored} items · Domain: {learned.domain}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

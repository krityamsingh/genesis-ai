import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useGenesisStore from '../store/genesisStore'
import useWave         from '../hooks/useWave'
import { voiceAPI }    from '../api/client'
import Badge    from '../components/Badge'
import Loader   from '../components/Loader'
import StatusDot from '../components/StatusDot'

const BAR_COUNT = 32

export default function Voice() {
  const navigate = useNavigate()
  const { transcript, setTranscript, recording, setRecording, addMessage } = useGenesisStore()

  const { bars, startWave, stopWave } = useWave(BAR_COUNT)

  const [ttsText,    setTtsText]    = useState('GENESIS is a self-learning AI system built on Gemma 3.')
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [sttLoading, setSttLoading] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [lang,       setLang]       = useState('en')

  const mediaRef   = useRef(null)
  const chunksRef  = useRef([])
  const timerRef   = useRef(null)
  const audioRef   = useRef(null)

  useEffect(() => () => {
    stopWave()
    clearInterval(timerRef.current)
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop())
  }, [stopWave])

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setRecording(true)
    setTranscript('')
    setRecSeconds(0)
    chunksRef.current = []

    await startWave()

    timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.start(100)
      mediaRef.current = { recorder, stream }
    } catch {
      // No mic — demo mode
    }
  }

  const stopRecording = async () => {
    clearInterval(timerRef.current)
    stopWave()
    setRecording(false)
    setSttLoading(true)

    const rec = mediaRef.current
    if (rec?.recorder?.state !== 'inactive') {
      rec?.recorder?.stop()
      rec?.stream?.getTracks().forEach(t => t.stop())
    }

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      if (blob.size > 100) {
        const res = await voiceAPI.transcribe(blob)
        setTranscript(res.data?.transcript || '')
      } else {
        // Demo fallback
        await new Promise(r => setTimeout(r, 800))
        setTranscript('What are the key differences between self-attention and cross-attention in transformer architectures?')
      }
    } catch {
      await new Promise(r => setTimeout(r, 700))
      setTranscript('What are the key differences between self-attention and cross-attention in transformer architectures?')
    } finally {
      setSttLoading(false)
    }
  }

  const toggleRecord = () => recording ? stopRecording() : startRecording()

  // ── Send transcript to chat ───────────────────────────────────────────────
  const sendToChat = () => {
    if (!transcript) return
    addMessage({ role: 'user', content: transcript })
    navigate('/chat')
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  const handleSpeak = async () => {
    if (!ttsText.trim() || ttsLoading) return
    setTtsLoading(true)
    try {
      const res  = await voiceAPI.speak(ttsText, lang)
      const url  = URL.createObjectURL(res.data)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play()
        setTtsPlaying(true)
        audioRef.current.onended = () => setTtsPlaying(false)
      }
    } catch {
      // Demo: just toggle state
      setTtsPlaying(true)
      setTimeout(() => setTtsPlaying(false), 3000)
    } finally {
      setTtsLoading(false)
    }
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 28, gap: 22, overflowY: 'auto',
      background: 'radial-gradient(circle at 50% 35%, rgba(245,158,11,.05) 0%, transparent 55%)',
    }}>
      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Space Mono",monospace', fontSize: 17, fontWeight: 700, marginBottom: 3,
        }}>
          Voice Interface
        </div>
        <div style={{ fontSize: 10, color: 'var(--t2)' }}>
          STT via Whisper &nbsp;·&nbsp; TTS via gTTS &nbsp;·&nbsp; Gemma 3 27B
        </div>
      </div>

      {/* Waveform */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2.5,
        height: 80, padding: '12px 20px',
        background: 'var(--bg1)',
        border: `1px solid ${recording ? 'rgba(245,158,11,.4)' : 'var(--b0)'}`,
        borderRadius: 10,
        boxShadow: recording ? '0 0 24px rgba(245,158,11,.1)' : 'none',
        transition: 'all .3s',
        minWidth: 280,
      }}>
        {bars.map((h, i) => (
          <div
            key={i}
            className={`wave-bar${recording ? ' active' : ''}`}
            style={{ height: Math.max(3, h) }}
          />
        ))}
      </div>

      {/* Timer */}
      {recording && (
        <div style={{
          fontSize: 13, color: 'var(--rd)', fontFamily: '"Space Mono",monospace',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <StatusDot color="var(--rd)" pulse />
          {fmt(recSeconds)} recording
        </div>
      )}

      {/* Record button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleRecord}
          disabled={sttLoading}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: recording ? 'rgba(244,63,94,.15)' : 'rgba(245,158,11,.1)',
            border: `2px solid ${recording ? 'var(--rd)' : 'var(--acc)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            boxShadow: recording ? '0 0 22px rgba(244,63,94,.3)' : '0 0 22px rgba(245,158,11,.15)',
            transition: 'all .2s',
          }}
        >
          {recording ? '■' : sttLoading ? <Loader /> : '🎙'}
        </button>
        <span style={{ fontSize: 11, color: recording ? 'var(--rd)' : 'var(--t2)' }}>
          {sttLoading ? 'Transcribing…' : recording ? 'Click to stop' : 'Click to record'}
        </span>
      </div>

      {/* Transcript result */}
      {transcript && (
        <div className="animate-fadein" style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg1)', border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div className="g-label">TRANSCRIPT — Whisper</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <Badge text="STT" color="#10B981" small />
              <button
                className="g-btn"
                onClick={sendToChat}
                style={{ padding: '2px 8px', fontSize: 10 }}
              >
                → Send to Chat
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t0)', lineHeight: 1.65 }}>
            {transcript}
          </div>
        </div>
      )}

      {/* TTS panel */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg1)', border: '1px solid var(--b0)',
        borderRadius: 8, padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div className="g-label">TEXT-TO-SPEECH</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--t2)' }}>lang</span>
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              style={{ padding: '3px 6px', fontSize: 10, width: 60 }}
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="fr">FR</option>
              <option value="de">DE</option>
              <option value="es">ES</option>
              <option value="ja">JA</option>
            </select>
          </div>
        </div>

        <textarea
          value={ttsText}
          onChange={e => setTtsText(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '8px 10px', resize: 'none', fontSize: 11, lineHeight: 1.55 }}
        />

        <div style={{ marginTop: 8 }}>
          <button
            className="g-btn-primary"
            onClick={handleSpeak}
            disabled={ttsLoading || ttsPlaying || !ttsText.trim()}
            style={{ padding: '7px 16px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {ttsLoading
              ? <><Loader size={11} color="#06060A" /> Generating…</>
              : ttsPlaying
              ? <><StatusDot color="#06060A" pulse /> Speaking…</>
              : '▶ Speak'
            }
          </button>
          {ttsPlaying && (
            <button
              onClick={() => { audioRef.current?.pause(); setTtsPlaying(false) }}
              className="g-btn"
              style={{ marginLeft: 6, padding: '7px 12px', fontSize: 11 }}
            >
              ■ Stop
            </button>
          )}
        </div>
      </div>

      {/* Info chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Badge text="Whisper STT"   color="#60A5FA" />
        <Badge text="gTTS"          color="#10B981" />
        <Badge text="Gemma 3 27B"   color="#F59E0B" />
        <Badge text="WebM / WAV"    color="#8B5CF6" />
      </div>
    </div>
  )
}

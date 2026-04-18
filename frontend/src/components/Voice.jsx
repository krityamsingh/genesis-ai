// ══════════════════════════════════════════════════════════════════════════════
// Voice.jsx
// ══════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react'
import { toast } from '../lib/toast'

export function Voice() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response,   setResponse]   = useState('')
  const [speed,      setSpeed]      = useState('1×')
  const waveRef  = useRef(null)
  const timerRef = useRef(null)

  const animateBars = () => {
    if (!waveRef.current) return
    const bars = waveRef.current.querySelectorAll('.wave-bar')
    bars.forEach(bar => {
      bar.style.height = (4 + Math.random() * 40) + 'px'
      bar.classList.add('active')
    })
  }

  const stopBars = () => {
    if (!waveRef.current) return
    waveRef.current.querySelectorAll('.wave-bar').forEach(bar => {
      bar.style.height = '4px'
      bar.classList.remove('active')
    })
  }

  const toggleRecord = () => {
    if (processing) return
    if (!recording) {
      setRecording(true)
      timerRef.current = setInterval(animateBars, 80)
    } else {
      clearInterval(timerRef.current)
      stopBars()
      setRecording(false)
      setProcessing(true)
      setTimeout(() => {
        setTranscript('"Explain how attention mechanisms work in transformer models"')
        setProcessing(false)
        toast('Voice processed successfully', 'success')
        setTimeout(() => {
          setResponse('Attention mechanisms allow transformers to weigh the relevance of different positions in a sequence when processing each element. For every token, the model computes Query, Key, and Value vectors — attention scores are calculated as dot products between queries and keys, scaled and softmax-normalised to produce weights over values.')
        }, 500)
      }, 1200)
    }
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  const orbColor   = recording ? 'var(--red)' : processing ? 'var(--amber)' : 'var(--border-default)'
  const orbShadow  = recording ? '0 0 0 4px var(--red-dim), 0 0 40px rgba(239,68,68,.2)' : 'none'

  return (
    <div style={{
      height:         '100%',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '28px',
      padding:        '40px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Voice Interface</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Speak to GENESIS · STT + TTS</p>
      </div>

      {/* Mic orb */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {recording && (
          <>
            <div style={{
              position: 'absolute', width: '120px', height: '120px',
              borderRadius: '50%', border: '1px solid var(--red)',
              animation: 'orbExpand 1.5s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', width: '120px', height: '120px',
              borderRadius: '50%', border: '1px solid var(--red)',
              animation: 'orbExpand 1.5s ease-out .5s infinite',
            }} />
          </>
        )}
        <style>{`
          @keyframes orbExpand {
            0%   { width:120px;height:120px;opacity:.8 }
            100% { width:200px;height:200px;opacity:0 }
          }
        `}</style>
        <div
          onClick={toggleRecord}
          style={{
            width:          '120px',
            height:         '120px',
            borderRadius:   '50%',
            background:     'var(--bg-surface)',
            border:         `2px solid ${orbColor}`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '36px',
            cursor:         processing ? 'wait' : 'pointer',
            transition:     'all 300ms',
            boxShadow:      orbShadow,
            position:       'relative',
            zIndex:         2,
          }}
        >
          {processing ? <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} /> : recording ? '⏹' : '🎤'}
        </div>
      </div>

      <div style={{ fontSize: '13px', color: recording ? 'var(--red)' : processing ? 'var(--amber)' : 'var(--text-muted)' }}>
        {processing ? 'Processing…' : recording ? 'Recording… click to stop' : 'Click to start recording'}
      </div>

      {/* Wave bars */}
      <div ref={waveRef} style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '48px' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="wave-bar" style={{ height: '4px' }} />
        ))}
      </div>

      {/* Transcript */}
      <div style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding:      '16px 20px',
        maxWidth:     '500px',
        width:        '100%',
        minHeight:    '60px',
      }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: '8px' }}>Transcript</div>
        <div style={{ fontSize: '14px', color: transcript ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {transcript || 'Your speech will appear here…'}
        </div>
      </div>

      {/* Response */}
      {response && (
        <div style={{
          background:   'var(--accent-dim)',
          border:       '1px solid var(--border-accent)',
          borderRadius: '14px',
          padding:      '16px 20px',
          maxWidth:     '500px',
          width:        '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span>🔥</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>GENESIS</span>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '3px 8px', marginLeft: 'auto' }} onClick={() => toast('TTS playing', 'info')}>▶ Play</button>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{response}</div>
        </div>
      )}

      {/* Speed controls */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['0.75×', '1×', '1.25×', '1.5×'].map(s => (
          <button
            key={s}
            className={`btn ${speed === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => { setSpeed(s); toast(`Speed: ${s}`, 'info') }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Voice

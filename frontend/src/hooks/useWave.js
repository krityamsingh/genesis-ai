import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useWave
 *
 * Drives a live waveform visualiser from the microphone via Web Audio API.
 * Falls back to random heights when API is unavailable (e.g. insecure context).
 *
 * Returns:
 *   bars        – Array<number>  heights in px (0–60)
 *   startWave   – () => void     start animating from mic
 *   stopWave    – () => void     stop and reset to flat
 *   barCount    – number         how many bars
 */
export function useWave(barCount = 28) {
  const [bars, setBars]     = useState(Array(barCount).fill(3))
  const rafRef  = useRef(null)
  const srcRef  = useRef(null)
  const ctxRef  = useRef(null)
  const anRef   = useRef(null)
  const mockRef = useRef(null)

  const stopWave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(mockRef.current)
    anRef.current?.disconnect()
    srcRef.current?.disconnect()
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    setBars(Array(barCount).fill(3))
  }, [barCount])

  const startWave = useCallback(async () => {
    stopWave()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx    = new (window.AudioContext || window.webkitAudioContext)()
      const src    = ctx.createMediaStreamSource(stream)
      const an     = ctx.createAnalyser()
      an.fftSize   = 64
      src.connect(an)
      ctxRef.current = ctx
      srcRef.current = src
      anRef.current  = an

      const data = new Uint8Array(an.frequencyBinCount)
      const tick = () => {
        an.getByteFrequencyData(data)
        const slice = Math.floor(data.length / barCount)
        const heights = Array.from({ length: barCount }, (_, i) => {
          const avg = data.slice(i * slice, i * slice + slice).reduce((a, b) => a + b, 0) / slice
          return Math.max(3, (avg / 255) * 58)
        })
        setBars(heights)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()

    } catch {
      // No mic permission → simulate with random heights
      mockRef.current = setInterval(() => {
        setBars(Array.from({ length: barCount }, () => Math.random() * 52 + 6))
      }, 90)
    }
  }, [barCount, stopWave])

  useEffect(() => () => stopWave(), [stopWave])

  return { bars, startWave, stopWave, barCount }
}

export default useWave

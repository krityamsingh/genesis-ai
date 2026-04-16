/**
 * StatusDot — coloured indicator dot with optional pulse
 *
 * FIX: File was named StatuDot.jsx (typo). Renamed to StatusDot.jsx.
 * All 7 pages import from '../components/StatusDot' — this file must
 * exist at that exact path or the entire app fails to compile.
 *
 * Props:
 *   color   hex string
 *   pulse   bool – animate a slow blink (default false)
 *   size    number – diameter in px (default 6)
 */
export default function StatusDot({ color, pulse = false, size = 6 }) {
  return (
    <span
      className={`g-dot${pulse ? ' g-dot-pulse' : ''}`}
      style={{
        width:      size,
        height:     size,
        background: color,
        color,        // used by g-dot-pulse animation via currentColor
        flexShrink:  0,
      }}
    />
  )
}

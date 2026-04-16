/**
 * StatusDot — coloured indicator dot with optional pulse
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
        width:     size,
        height:    size,
        background: color,
        color,        // used by g-dot-pulse animation via currentColor
        flexShrink: 0,
      }}
    />
  )
}

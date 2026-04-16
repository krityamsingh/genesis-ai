/**
 * Loader — spinning ring indicator
 *
 * Props:
 *   size    px (default 14)
 *   color   hex (default #F59E0B)
 */
export default function Loader({ size = 14, color = '#F59E0B' }) {
  return (
    <span
      className="animate-spin1"
      style={{
        display:     'inline-block',
        width:       size,
        height:      size,
        border:      `2px solid ${color}33`,
        borderTop:   `2px solid ${color}`,
        borderRadius:'50%',
        flexShrink:  0,
      }}
    />
  )
}

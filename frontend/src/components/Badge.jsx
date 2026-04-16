/**
 * Badge — small mono label chip
 *
 * Props:
 *   text    string
 *   color   hex string for accent (default #F59E0B)
 *   small   bool – smaller padding variant
 */
export default function Badge({ text, color = '#F59E0B', small = false }) {
  return (
    <span
      className="g-badge"
      style={{
        background:   `${color}1A`,
        color,
        border:       `1px solid ${color}44`,
        padding:      small ? '1px 5px' : '2px 7px',
        fontSize:     small ? '9px' : '10px',
      }}
    >
      {text}
    </span>
  )
}

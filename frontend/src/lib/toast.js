// ── lib/toast.js ──────────────────────────────────────────────────────────────
// Lightweight toast system using a custom event bus

const listeners = []

export const toast = {
  success: (msg, sub) => emit('success', msg, sub),
  error:   (msg, sub) => emit('error',   msg, sub),
  info:    (msg, sub) => emit('info',    msg, sub),
  loading: (msg, sub) => emit('loading', msg, sub),
}

function emit(type, msg, sub) {
  const event = { id: Date.now() + Math.random(), type, msg, sub }
  listeners.forEach(fn => fn(event))
}

export function onToast(fn) {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}

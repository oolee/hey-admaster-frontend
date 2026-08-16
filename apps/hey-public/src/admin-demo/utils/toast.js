import { reactive } from 'vue'

const state = reactive({ toasts: [] })
let seed = 0

function dismiss(id) {
  const idx = state.toasts.findIndex((t) => t.id === id)
  if (idx !== -1) state.toasts.splice(idx, 1)
}

function push(type, message, duration = 3000) {
  const id = ++seed
  state.toasts.push({ id, type, message })
  setTimeout(() => dismiss(id), duration)
}

export const toast = {
  success: (m) => push('success', m),
  error: (m) => push('error', m),
  info: (m) => push('info', m),
  dismiss,
  state
}
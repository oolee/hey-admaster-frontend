import { reactive } from 'vue';

export interface ToastItem {
  id: number;
  type: 'error' | 'info' | 'success';
  message: string;
}

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] });
let seed = 0;

function dismiss(id: number) {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}

function push(type: ToastItem['type'], message: string, duration = 3000) {
  const id = ++seed;
  state.toasts.push({ id, type, message });
  setTimeout(() => dismiss(id), duration);
}

export const toast = {
  success: (m: string) => push('success', m),
  error: (m: string) => push('error', m),
  info: (m: string) => push('info', m),
  dismiss,
  state,
};

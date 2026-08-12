import { reactive } from 'vue';

export interface ToastItem {
  id: number;
  type: 'error' | 'info' | 'success';
  message: string;
}

const state = reactive<{ toasts: ToastItem[] }>({ toasts: [] });
let seed = 0;

function dismiss(id: number): void {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}

function push(type: ToastItem['type'], message: string, duration = 3200): void {
  const id = ++seed;
  state.toasts.push({ id, type, message });
  setTimeout(() => dismiss(id), duration);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
  dismiss,
  state,
};

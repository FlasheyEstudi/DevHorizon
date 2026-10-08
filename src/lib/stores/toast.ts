// =============================================================================
// toast.ts — Store global de notificaciones Toast (nanostores)
// =============================================================================
// Permite emitir notificaciones flotantes desde cualquier isla React o script JS.
// =============================================================================

import { atom } from 'nanostores';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export const toastsAtom = atom<Toast[]>([]);

export function removeToast(id: string): void {
  toastsAtom.set(toastsAtom.get().filter((t) => t.id !== id));
}

export function showToast(toastInput: Omit<Toast, 'id'>): string {
  const id = Math.random().toString(36).substring(2, 9);
  const duration = toastInput.duration ?? 4000;
  const newToast: Toast = { ...toastInput, id };

  toastsAtom.set([...toastsAtom.get(), newToast]);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export const toast = {
  success: (message: string, title?: string, duration?: number) =>
    showToast({ type: 'success', message, title, duration }),
  error: (message: string, title?: string, duration?: number) =>
    showToast({ type: 'error', message, title, duration }),
  info: (message: string, title?: string, duration?: number) =>
    showToast({ type: 'info', message, title, duration }),
  warning: (message: string, title?: string, duration?: number) =>
    showToast({ type: 'warning', message, title, duration }),
};

if (typeof window !== 'undefined') {
  (window as unknown as { toast: typeof toast }).toast = toast;
}

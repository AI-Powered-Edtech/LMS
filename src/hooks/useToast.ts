import { create } from 'zustand'

/* ─── Types ───────────────────────────────────────────────────── */

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  description?: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

/* ─── Constants ───────────────────────────────────────────────── */

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 5000

/* ─── Timers ──────────────────────────────────────────────────── */

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimer(id: string) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

/* ─── Unique ID Generator ─────────────────────────────────────── */

let counter = 0

function generateId(): string {
  counter += 1
  return `toast-${Date.now()}-${counter}`
}

/* ─── Store ───────────────────────────────────────────────────── */

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId()
    const newToast: Toast = { ...toast, id }

    set((state) => {
      // Remove oldest toasts if exceeding max
      const existing = [...state.toasts]
      while (existing.length >= MAX_TOASTS) {
        const removed = existing.shift()
        if (removed) clearTimer(removed.id)
      }
      return { toasts: [...existing, newToast] }
    })

    // Auto-dismiss after timeout
    const timer = setTimeout(() => {
      get().removeToast(id)
    }, AUTO_DISMISS_MS)

    timers.set(id, timer)
  },

  removeToast: (id) => {
    clearTimer(id)
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

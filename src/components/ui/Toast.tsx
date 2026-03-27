// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { type Toast as ToastType, useToast } from '@/src/hooks/useToast'
import { cn } from '@/src/utils/cn'

/* ─── Icon Map ────────────────────────────────────────────────── */

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const

/* ─── Style Variants ──────────────────────────────────────────── */

const toastVariants = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
} as const

const iconVariants = {
  success: 'text-emerald-500 dark:text-emerald-400',
  error: 'text-red-500 dark:text-red-400',
  warning: 'text-amber-500 dark:text-amber-400',
  info: 'text-blue-500 dark:text-blue-400',
} as const

/* ─── Single Toast Item ───────────────────────────────────────── */

interface ToastItemProps {
  toast: ToastType
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const Icon = icons[toast.type]

  useEffect(() => {
    // Trigger enter animation
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => {
      el.classList.remove('translate-x-full', 'opacity-0')
      el.classList.add('translate-x-0', 'opacity-100')
    })
  }, [])

  const handleDismiss = () => {
    const el = ref.current
    if (el) {
      el.classList.remove('translate-x-0', 'opacity-100')
      el.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => onDismiss(toast.id), 200)
    } else {
      onDismiss(toast.id)
    }
  }

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 w-80 max-w-full p-4 rounded-xl border shadow-lg',
        'translate-x-full opacity-0 transition-all duration-200 ease-out',
        toastVariants[toast.type]
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconVariants[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.message}</p>
        {toast.description && <p className="mt-1 text-sm opacity-80">{toast.description}</p>}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick()
              handleDismiss()
            %DCLOSE%}
            className="mt-2 text-xs font-bold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-current"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ─── Toast Container ─────────────────────────────────────────── */

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts)
  const removeToast = useToast((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Notifikasi"
      aria-live="polite"
      className="fixed top-4 right-4 z-[70] flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  )
}

/* ─── Re-export for convenience ───────────────────────────────── */

export type { Toast } from '@/src/hooks/useToast'
export { useToast } from '@/src/hooks/useToast'

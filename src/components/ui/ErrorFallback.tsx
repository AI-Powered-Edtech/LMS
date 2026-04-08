import { AlertTriangle } from 'lucide-react'

import { cn } from '@/utils/cn'

/* ─── Types ───────────────────────────────────────────────────── */

export interface ErrorFallbackProps {
  title?: string
  description?: string
  onRetry?: () => void
  showHomeLink?: boolean
  className?: string
}

/* ─── Error Fallback Component ────────────────────────────────── */

export function ErrorFallback({
  title = 'Terjadi Kesalahan',
  description = 'Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
  onRetry,
  showHomeLink = true,
  className,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center px-6 py-16', className)}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8">{description}</p>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'inline-flex items-center justify-center font-semibold text-sm px-4 py-2 rounded-xl transition-all duration-200 outline-none',
              'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97]',
              'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-slate-900'
            )}
          >
            Coba Lagi
          </button>
        )}

        {showHomeLink && (
          <a
            href="/app"
            className={cn(
              'inline-flex items-center justify-center font-semibold text-sm px-4 py-2 rounded-xl transition-all duration-200 outline-none',
              'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.97]',
              'focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
              'dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
              'dark:focus-visible:ring-offset-slate-900'
            )}
          >
            Kembali ke Beranda
          </a>
        )}
      </div>
    </div>
  )
}

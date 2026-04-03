import { CheckCircle, RefreshCw, XCircle } from 'lucide-react'

import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

// ==========================================================================
// LTIGradeStatus
// Phase 35C — Small status badge indicating LTI grade passback result.
// ==========================================================================

export interface LTIGradeStatusProps {
  /** Current passback status. null = render nothing. */
  status: 'success' | 'failed' | 'pending' | null
  /** Called when the retry button is clicked (only shown on 'failed'). */
  onRetry?: () => void
  className?: string
}

export function LTIGradeStatus({ status, onRetry, className }: LTIGradeStatusProps) {
  if (!status) return null

  if (status === 'pending') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          'bg-slate-100 text-slate-600',
          'dark:bg-slate-700 dark:text-slate-300',
          className
        )}
      >
        <Spinner size="sm" className="w-3 h-3" />
        Mengirim nilai...
      </span>
    )
  }

  if (status === 'success') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          'bg-emerald-50 text-emerald-700 border border-emerald-200',
          'dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
          className
        )}
      >
        <CheckCircle className="w-3 h-3" />
        Nilai terkirim ke LMS
      </span>
    )
  }

  // status === 'failed'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'bg-red-50 text-red-700 border border-red-200',
        'dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        className
      )}
    >
      <XCircle className="w-3 h-3 shrink-0" />
      Pengiriman nilai gagal
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          title="Coba kirim ulang"
          className={cn(
            'ml-0.5 p-0.5 rounded-full transition-colors',
            'hover:bg-red-100 dark:hover:bg-red-800/40',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500'
          )}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

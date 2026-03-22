import { cn } from '@/src/utils/cn'

interface DiscussionEmptyStateProps {
  message?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Empty state untuk Diskusi saat tidak ada data.
 */
export function DiscussionEmptyState({
  message = 'Belum ada data diskusi',
  action,
  className,
}: DiscussionEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        'rounded-2xl border border-dashed border-slate-300 dark:border-slate-600',
        'bg-slate-50 dark:bg-slate-800/50',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4">
        <span className="text-2xl text-slate-400 dark:text-slate-500">📋</span>
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-center mb-4">{message}</p>
      {action}
    </div>
  )
}

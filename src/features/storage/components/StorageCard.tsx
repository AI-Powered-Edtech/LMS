import { cn } from '@/src/utils/cn'
import { Skeleton } from '@/src/components/ui/Skeleton'

interface StorageCardProps {
  title: string
  description?: string
  className?: string
  isLoading?: boolean
}

/**
 * Card untuk menampilkan item Penyimpanan.
 */
export function StorageCard({ title, description, className, isLoading }: StorageCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800',
          className
        )}
      >
        <Skeleton className="h-5 w-2/3 mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-slate-700 p-4',
        'bg-white dark:bg-slate-800 hover:shadow-md transition-shadow',
        className
      )}
    >
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      )}
    </div>
  )
}

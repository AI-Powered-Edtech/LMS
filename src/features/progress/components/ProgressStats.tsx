import { cn } from '@/src/utils/cn'
import { Skeleton } from '@/src/components/ui/Skeleton'

interface StatItem {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
}

interface ProgressStatsProps {
  stats: StatItem[]
  isLoading?: boolean
  className?: string
}

/**
 * Kartu statistik untuk Kemajuan.
 */
export function ProgressStats({ stats, isLoading, className }: ProgressStatsProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800"
          >
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          {stat.trend && (
            <span
              className={cn(
                'text-xs font-medium',
                stat.trend === 'up' && 'text-green-600 dark:text-green-400',
                stat.trend === 'down' && 'text-red-600 dark:text-red-400',
                stat.trend === 'neutral' && 'text-slate-500 dark:text-slate-400'
              )}
            >
              {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

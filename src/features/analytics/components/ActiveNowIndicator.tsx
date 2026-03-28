import { Users } from 'lucide-react'

import { cn } from '@/src/utils/cn'

interface ActiveNowIndicatorProps {
  count: number
  className?: string
}

export function ActiveNowIndicator({ count, className }: ActiveNowIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5',
        count > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800',
        className
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        )}
      />
      <Users
        className={cn(
          'h-3.5 w-3.5',
          count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
        )}
      />
      <span
        className={cn(
          'text-xs font-bold',
          count > 0
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-slate-500 dark:text-slate-400'
        )}
      >
        {count > 0 ? `${count} siswa aktif` : 'Tidak ada aktivitas'}
      </span>
    </div>
  )
}

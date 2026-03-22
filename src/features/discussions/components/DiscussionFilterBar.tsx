import { cn } from '@/src/utils/cn'

interface DiscussionFilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filterSlot?: React.ReactNode
  className?: string
}

/**
 * Bar filter dan pencarian untuk Diskusi.
 */
export function DiscussionFilterBar({
  searchValue,
  onSearchChange,
  filterSlot,
  className,
}: DiscussionFilterBarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 mb-4', className)}>
      <div className="relative flex-1">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari diskusi..."
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-sm',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            'placeholder-slate-400 dark:placeholder-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
          )}
        />
      </div>
      {filterSlot}
    </div>
  )
}

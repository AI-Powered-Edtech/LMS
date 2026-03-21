import { cn } from '@/src/utils/cn'

interface BlockSkeletonProps {
  type: string
}

export function BlockSkeleton({ type }: BlockSkeletonProps) {
  const base = 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded'

  switch (type) {
    case 'video':
      return (
        <div className="px-6 py-4">
          <div className={cn(base, 'w-full aspect-video flex items-center justify-center')}>
            <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        </div>
      )
    case 'image':
      return (
        <div className="px-6 py-4">
          <div className={cn(base, 'w-full h-64')} />
        </div>
      )
    case 'quiz':
    case 'assignment':
      return (
        <div className="px-6 py-4 space-y-3">
          <div className={cn(base, 'h-6 w-48')} />
          <div className={cn(base, 'h-4 w-full')} />
          <div className={cn(base, 'h-4 w-3/4')} />
          <div className={cn(base, 'h-10 w-32 mt-4')} />
        </div>
      )
    case 'text':
    default:
      return (
        <div className="px-6 py-4 space-y-2">
          <div className={cn(base, 'h-4 w-full')} />
          <div className={cn(base, 'h-4 w-5/6')} />
          <div className={cn(base, 'h-4 w-4/6')} />
        </div>
      )
  }
}

import { Skeleton } from '@/src/components/ui'

export function LeaderboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Podium 3 besar */}
      <div className="flex items-end justify-center gap-4 mb-10">
        {/* Posisi 2 */}
        <div className="flex flex-col items-center">
          <Skeleton className="h-16 w-16 rounded-full mb-2" />
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-20 w-24 rounded-t-xl mt-3" />
        </div>
        {/* Posisi 1 */}
        <div className="flex flex-col items-center">
          <Skeleton className="h-20 w-20 rounded-full mb-2" />
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-28 w-24 rounded-t-xl mt-3" />
        </div>
        {/* Posisi 3 */}
        <div className="flex flex-col items-center">
          <Skeleton className="h-14 w-14 rounded-full mb-2" />
          <Skeleton className="h-4 w-18 mb-1" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-14 w-24 rounded-t-xl mt-3" />
        </div>
      </div>
      {/* Tabel peringkat */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

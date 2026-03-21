import { Skeleton } from '@/src/components/ui'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-pulse">
      {/* Kartu statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"
          >
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Area grafik */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      {/* Daftar aktivitas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-32 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

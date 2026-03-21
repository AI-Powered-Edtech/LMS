import { Skeleton } from '@/src/components/ui'

export function SmartPlayerSkeleton() {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] animate-pulse">
      {/* Sidebar daftar pelajaran */}
      <div className="w-full md:w-72 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 overflow-y-auto">
        <Skeleton className="h-5 w-32 mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      {/* Area konten utama */}
      <div className="flex-1 p-6 md:p-8 bg-slate-50 dark:bg-slate-900 space-y-6 overflow-y-auto">
        {/* Judul pelajaran */}
        <Skeleton className="h-7 w-2/3" />
        {/* Area video/konten */}
        <Skeleton className="h-72 md:h-96 w-full rounded-2xl" />
        {/* Teks konten */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  )
}

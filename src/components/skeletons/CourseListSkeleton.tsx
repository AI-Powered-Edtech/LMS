import { Skeleton } from '@/src/components/ui'

export function CourseListSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      {/* Grid kursus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {/* Gambar placeholder */}
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-5 space-y-3">
              {/* Judul */}
              <Skeleton className="h-5 w-3/4" />
              {/* Deskripsi */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

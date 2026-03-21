import { Skeleton } from '@/src/components/ui'

export function CourseDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Banner hero */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-2/3 mb-3" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      {/* Konten: sidebar + area utama */}
      <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar daftar modul */}
        <div className="w-full md:w-72 shrink-0 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
            >
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        {/* Area konten utama */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-48 w-full rounded-xl mt-4" />
        </div>
      </div>
    </div>
  )
}

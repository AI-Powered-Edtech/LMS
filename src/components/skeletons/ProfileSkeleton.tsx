import { Skeleton } from '@/src/components/ui'

export function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-pulse">
      {/* Header profil */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          {/* Info pengguna */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-56 mx-auto sm:mx-0" />
          </div>
          {/* Tombol edit */}
          <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
        </div>
      </div>
      {/* Kartu informasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4"
          >
            <Skeleton className="h-5 w-32 mb-2" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

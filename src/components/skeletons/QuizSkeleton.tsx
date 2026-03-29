// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { Skeleton } from '@/src/components/ui'

export function QuizSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 animate-pulse">
      {/* Header kuis */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
        <Skeleton className="h-6 w-1/2 mb-3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      {/* Area pertanyaan */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-6">
        {/* Teks pertanyaan */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        {/* Opsi jawaban */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" style={{ width: `${65 + i * 8}%` }} />
            </div>
          ))}
        </div>
        {/* Tombol navigasi */}
        <div className="flex items-center justify-between pt-4">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

import { BookOpen, Circle } from 'lucide-react'

import { cn } from '@/utils/cn'

import { useCourseDashboard } from '../queries/analyticsQueries'

interface LiveLessonMapProps {
  courseId: string
  activeLessonIds: Set<string>
}

export function LiveLessonMap({ courseId, activeLessonIds }: LiveLessonMapProps) {
  const { data: courseData, isLoading } = useCourseDashboard(courseId)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!courseData) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-indigo-500" />
        Peta Aktivitas Pelajaran
      </h3>

      <div className="space-y-2">
        {activeLessonIds.size === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Belum ada siswa yang aktif di pelajaran manapun
          </p>
        ) : (
          Array.from(activeLessonIds).map((lessonId) => (
            <div
              key={lessonId}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 border',
                'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
              )}
            >
              <Circle className="h-3 w-3 text-emerald-500 fill-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Pelajaran aktif
              </span>
              <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                Live
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

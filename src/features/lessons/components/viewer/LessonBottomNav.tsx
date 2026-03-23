import { Award, ChevronLeft, ChevronRight } from 'lucide-react'

import type { Lesson } from '../../index'

interface LessonBottomNavProps {
  prevLesson: Lesson | null
  nextLesson: Lesson | null
  isLastLesson: boolean
  onSelectLesson: (id: string) => void
}

export function LessonBottomNav({
  prevLesson,
  nextLesson,
  isLastLesson,
  onSelectLesson,
}: LessonBottomNavProps) {
  return (
    <div className="shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between gap-3">
      {prevLesson ? (
        <button
          onClick={() => onSelectLesson(prevLesson.id)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Pelajaran Sebelumnya
        </button>
      ) : (
        <div />
      )}
      {nextLesson ? (
        <button
          onClick={() => onSelectLesson(nextLesson.id)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-sm"
        >
          Pelajaran Berikutnya
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : isLastLesson ? (
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
          <Award className="w-4 h-4" />
          Modul Selesai!
        </div>
      ) : null}
    </div>
  )
}

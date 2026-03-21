import { Card, Skeleton, Badge } from '@/src/components/ui'
import { cn } from '@/src/utils/cn'
import { formatTime, formatPct, pctColor, pctBgColor } from '../utils/formatters'
import type { LessonAnalytics } from '../types'

interface LessonBreakdownTableProps {
  data: LessonAnalytics[]
  isLoading: boolean
  selectedLessonId: string | null
  onLessonSelect: (lessonId: string) => void
}

export function LessonBreakdownTable({
  data,
  isLoading,
  selectedLessonId,
  onLessonSelect,
}: LessonBreakdownTableProps) {
  if (isLoading) {
    return (
      <Card padding="none">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700/60">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700/60">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Detail Per Pelajaran</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Klik baris untuk melihat detail siswa
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3 font-bold">Modul</th>
              <th className="px-6 py-3 font-bold">Pelajaran</th>
              <th className="px-4 py-3 font-bold text-center">Siswa</th>
              <th className="px-4 py-3 font-bold text-center">Avg Selesai</th>
              <th className="px-4 py-3 font-bold text-center">Avg Waktu</th>
              <th className="px-4 py-3 font-bold text-center">Kesulitan</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  Belum ada data pelajaran untuk kursus ini.
                </td>
              </tr>
            ) : (
              data.map((lesson) => {
                const isSelected = selectedLessonId === lesson.lesson_id
                return (
                  <tr
                    key={lesson.lesson_id}
                    onClick={() => onLessonSelect(lesson.lesson_id)}
                    className={cn(
                      'cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-700/40',
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <td className="px-6 py-3 text-xs text-slate-400 dark:text-slate-500">
                      {lesson.module_title}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {lesson.lesson_title}
                    </td>
                    <td className="px-4 py-3 text-center">{lesson.total_students}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn('font-semibold', pctColor(lesson.avg_completion_pct))}>
                          {formatPct(lesson.avg_completion_pct)}
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pctBgColor(lesson.avg_completion_pct)
                            )}
                            style={{ width: `${Math.min(lesson.avg_completion_pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                      {formatTime(lesson.avg_time_spent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lesson.struggling_students > 0 ? (
                        <Badge variant="danger" size="sm">
                          {lesson.struggling_students}
                          {lesson.high_risk_students > 0 && (
                            <span className="ml-0.5 opacity-70">
                              ({lesson.high_risk_students} tinggi)
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Aman
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

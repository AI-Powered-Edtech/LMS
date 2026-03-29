import { Badge, Card, Skeleton } from '@/src/components/ui'
import { VirtualTable } from '@/src/components/ui/VirtualTable'
import { cn } from '@/src/utils/cn'

import type { LessonAnalytics } from '../types'
import { formatPct, formatTime, pctBgColor, pctColor } from '../utils/formatters'

const columns = [
  {
    header: 'Modul',
    key: 'module_title',
    className: 'px-6 py-3 text-xs text-slate-400 dark:text-slate-500',
    render: (row: LessonAnalytics) => row.module_title,
  },
  {
    header: 'Pelajaran',
    key: 'lesson_title',
    className: 'px-6 py-3 font-medium text-slate-800 dark:text-slate-100',
    render: (row: LessonAnalytics) => row.lesson_title,
  },
  {
    header: 'Siswa',
    key: 'total_students',
    className: 'px-4 py-3 text-center',
    render: (row: LessonAnalytics) => row.total_students,
  },
  {
    header: 'Rata-rata Selesai',
    key: 'avg_completion_pct',
    className: 'px-4 py-3',
    render: (row: LessonAnalytics) => (
      <div className="flex flex-col items-center gap-1">
        <span className={cn('font-semibold', pctColor(row.avg_completion_pct))}>
          {formatPct(row.avg_completion_pct)}
        </span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={cn('h-full rounded-full transition-all', pctBgColor(row.avg_completion_pct))}
            style={{ width: `${Math.min(row.avg_completion_pct, 100)}%` }}
          />
        </div>
      </div>
    ),
  },
  {
    header: 'Rata-rata Waktu',
    key: 'avg_time_spent',
    className: 'px-4 py-3 text-center text-slate-500 dark:text-slate-400',
    render: (row: LessonAnalytics) => formatTime(row.avg_time_spent),
  },
  {
    header: 'Kesulitan',
    key: 'struggling',
    className: 'px-4 py-3 text-center',
    render: (row: LessonAnalytics) =>
      row.struggling_students > 0 ? (
        <Badge variant="danger" size="sm">
          {row.struggling_students}
          {row.high_risk_students > 0 && (
            <span className="ml-0.5 opacity-70">({row.high_risk_students} tinggi)</span>
          )}
        </Badge>
      ) : (
        <Badge variant="success" size="sm">
          Aman
        </Badge>
      ),
  },
]

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

      {data.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
          Belum ada data pelajaran untuk kursus ini.
        </div>
      ) : (
        <VirtualTable
          data={data}
          columns={columns}
          getRowKey={(r) => r.lesson_id}
          rowHeight={64}
          maxHeight={500}
          onRowClick={(row) => onLessonSelect(row.lesson_id)}
          rowClassName={(r) =>
            selectedLessonId === r.lesson_id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
          }
        />
      )}
    </Card>
  )
}

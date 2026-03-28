import { Users } from 'lucide-react'

import { Badge, Card, EmptyState, Skeleton } from '@/src/components/ui'
import { VirtualTable } from '@/src/components/ui/VirtualTable'
import { cn } from '@/src/utils/cn'

import type { EngagementSegment, StudentSignal } from '../types'
import { formatPct, formatTime, pctBgColor, relativeTime, struggleColor } from '../utils/formatters'
import { StudentEngagementCard } from './StudentEngagementCard'

const columns = [
  {
    header: 'Nama',
    key: 'student_name',
    className: 'px-6 py-3 font-medium text-slate-800 dark:text-slate-100',
    render: (row: StudentSignal) => row.student_name,
  },
  {
    header: 'Sesi',
    key: 'session_count',
    className: 'px-4 py-3 text-center',
    render: (row: StudentSignal) => row.session_count,
  },
  {
    header: 'Waktu',
    key: 'total_time_spent',
    className: 'px-4 py-3 text-center text-slate-500 dark:text-slate-400',
    render: (row: StudentSignal) => formatTime(row.total_time_spent),
  },
  {
    header: 'Progres',
    key: 'progress',
    className: 'px-4 py-3',
    render: (row: StudentSignal) => {
      const progressPct =
        row.blocks_total > 0 ? Math.round((row.blocks_viewed / row.blocks_total) * 100) : 0
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {row.blocks_viewed}/{row.blocks_total}
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={cn('h-full rounded-full transition-all', pctBgColor(progressPct))}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>
      )
    },
  },
  {
    header: 'Video',
    key: 'max_video_pct',
    className: 'px-4 py-3 text-center text-slate-500 dark:text-slate-400',
    render: (row: StudentSignal) => formatPct(row.max_video_pct),
  },
  {
    header: 'Kesulitan',
    key: 'struggle_score',
    className: 'px-4 py-3 text-center',
    render: (row: StudentSignal) => {
      const sc = struggleColor(row.struggle_score)
      return (
        <Badge
          variant={
            row.struggle_score >= 5 ? 'danger' : row.struggle_score >= 3 ? 'warning' : 'success'
          }
          size="sm"
        >
          {sc.label}
        </Badge>
      )
    },
  },
  {
    header: 'Keterlibatan',
    key: 'engagement',
    className: 'px-4 py-3 text-center',
    render: (row: StudentSignal) => (
      <StudentEngagementCard
        score={row.engagement_score}
        segment={row.engagement_segment as EngagementSegment | null | undefined}
      />
    ),
  },
  {
    header: 'Terakhir Aktif',
    key: 'last_accessed_at',
    className: 'px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400',
    render: (row: StudentSignal) => relativeTime(row.last_accessed_at),
  },
]

interface StudentProgressTableProps {
  data: StudentSignal[]
  isLoading: boolean
  lessonTitle?: string
}

export function StudentProgressTable({ data, isLoading, lessonTitle }: StudentProgressTableProps) {
  if (isLoading) {
    return (
      <Card padding="none">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700/60">
          <Skeleton className="h-5 w-56" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Belum ada data siswa"
          description={
            lessonTitle
              ? `Belum ada siswa yang mengakses pelajaran "${lessonTitle}".`
              : 'Pilih pelajaran untuk melihat data siswa.'
          }
        />
      </Card>
    )
  }

  return (
    <Card padding="none">
      <VirtualTable
        data={data}
        columns={columns}
        getRowKey={(row) => row.user_id + '-' + row.lesson_id}
        rowHeight={64}
        maxHeight={500}
      />
    </Card>
  )
}

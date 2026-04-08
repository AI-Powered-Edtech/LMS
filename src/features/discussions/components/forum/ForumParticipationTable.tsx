import { Clock, MessageSquare, TrendingUp, Users } from 'lucide-react'

import { VirtualTable } from '@/components/ui/VirtualTable'
import { cn } from '@/utils/cn'

import type { ForumParticipationRow } from '../../queries/discussionQueries'

interface ForumParticipationTableProps {
  data: ForumParticipationRow[]
  isLoading?: boolean
  error?: string | null
}

export function ForumParticipationTable({ data, isLoading, error }: ForumParticipationTableProps) {
  const columns = [
    {
      key: 'student',
      header: 'Siswa',
      render: (row: ForumParticipationRow) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
            {row.student_name.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-300">{row.student_name}</span>
        </div>
      ),
    },
    {
      key: 'posts',
      header: 'Postingan',
      render: (row: ForumParticipationRow) => (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {row.total_posts}
          </span>
        </div>
      ),
    },
    {
      key: 'comments',
      header: 'Komentar',
      render: (row: ForumParticipationRow) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {row.total_comments}
          </span>
        </div>
      ),
    },
    {
      key: 'participation_rate',
      header: 'Tingkat Partisipasi',
      render: (row: ForumParticipationRow) => {
        const rate = row.participation_rate
        const colorClass =
          rate >= 80
            ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
            : rate >= 60
              ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'

        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold',
              colorClass
            )}
          >
            <Users className="w-3 h-3" />
            {rate.toFixed(1)}%
          </span>
        )
      },
    },
    {
      key: 'last_activity',
      header: 'Aktivitas Terakhir',
      render: (row: ForumParticipationRow) => (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4" />
          {row.last_activity
            ? new Date(row.last_activity).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Belum ada aktivitas'}
        </div>
      ),
    },
  ]

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-red-600 dark:text-red-400 text-sm font-medium">
          Error memuat data partisipasi: {error}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Statistik Partisipasi Forum
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tingkat keterlibatan siswa dalam diskusi dan komentar
        </p>
      </div>

      <VirtualTable<ForumParticipationRow>
        data={data}
        columns={columns}
        rowHeight={60}
        maxHeight={500}
        getRowKey={(row) => row.student_id}
        emptyState={
          <div className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium italic">
            {isLoading ? 'Memuat data partisipasi...' : 'Belum ada data partisipasi forum.'}
          </div>
        }
      />
    </div>
  )
}

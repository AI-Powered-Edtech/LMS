import { api } from "@/src/lib/api"
import {
  CheckCircle2,
  Clock,
  Eye,
  HelpCircle,
  Loader2,
  PenLine,
  Search,
  XCircle,
} from 'lucide-react'
import { useMemo } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { VirtualTable } from '@/src/components/ui/VirtualTable'
import { AssignmentResultRow } from '@/src/features/quizzes'
import {
  formatDuration,
  getScoreBg,
  getScoreColor,
} from '@/src/features/quizzes/hooks/useQuizGradebookState'
import { cn } from '@/src/utils/cn'

interface QuizGradebookTableProps {
  filteredAttempts: AssignmentResultRow[]
  selectedAssignment: string
  selectedAssignmentTitle: string | undefined
  passingScore: number
  isLoading: boolean
  searchQuery: string
  error: string | null
  onSearchChange: (value: string) => void
  onOpenAttemptDetail: (attempt: AssignmentResultRow) => void
}

export function QuizGradebookTable({
  filteredAttempts,
  selectedAssignment,
  selectedAssignmentTitle,
  passingScore,
  isLoading,
  searchQuery,
  error,
  onSearchChange,
  onOpenAttemptDetail,
}: QuizGradebookTableProps) {
  const attemptColumns = useMemo(
    () => [
      {
        key: 'student_name',
        header: 'Siswa',
        render: (attempt: AssignmentResultRow) => (
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onOpenAttemptDetail(attempt)}
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <OptimizedImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${attempt.student_name}`}
                alt=""
              />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {attempt.student_name || 'Siswa'}
            </span>
          </div>
        ),
      },
      {
        key: 'score',
        header: 'Skor',
        render: (attempt: AssignmentResultRow) => (
          <div className="flex justify-center">
            <span
              className={cn(
                'inline-flex items-center justify-center w-14 h-8 rounded-lg text-sm',
                getScoreBg(attempt.score, passingScore),
                getScoreColor(attempt.score, passingScore)
              )}
            >
              {attempt.score ?? '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (attempt: AssignmentResultRow) => (
          <div className="flex flex-col items-center gap-1">
            {attempt.passed === true ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" /> Lulus
              </span>
            ) : attempt.passed === false ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                <XCircle className="w-3 h-3" /> Tidak Lulus
              </span>
            ) : (
              <span className="text-xs text-slate-400">Belum dinilai</span>
            )}
            {attempt.status === 'submitted' && attempt.passed === null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                <PenLine className="w-2.5 h-2.5" />
                Perlu Dinilai
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'time_spent',
        header: 'Waktu',
        render: (attempt: AssignmentResultRow) => (
          <div className="flex justify-center text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatDuration(attempt.time_spent)}
            </span>
          </div>
        ),
      },
      {
        key: 'submitted_at',
        header: 'Diserahkan',
        render: (attempt: AssignmentResultRow) => (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            {attempt.submitted_at
              ? new Date(attempt.submitted_at).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-'}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        render: (attempt: AssignmentResultRow) => (
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenAttemptDetail(attempt)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Detail
            </button>
          </div>
        ),
      },
    ],
    [passingScore, onOpenAttemptDetail]
  )

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        {selectedAssignmentTitle && (
          <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full shrink-0">
            {selectedAssignmentTitle}
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border-b border-red-100 dark:border-red-900/30">
          {error}
        </div>
      )}

      {!selectedAssignment ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-slate-500 dark:text-slate-400">
            Pilih kelas dan assignment
          </p>
          <p className="text-sm mt-1">untuk melihat rekap nilai siswa.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data...</span>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <Clock className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium text-slate-500 dark:text-slate-400">Belum ada percobaan</p>
          <p className="text-sm mt-1">Siswa belum mengerjakan assignment kuis ini.</p>
        </div>
      ) : (
        <VirtualTable<AssignmentResultRow>
          data={filteredAttempts}
          columns={attemptColumns}
          rowHeight={52}
          maxHeight={550}
          getRowKey={(attempt) => attempt.attempt_id ?? String(attempt.student_id)}
        />
      )}
    </div>
  )
}

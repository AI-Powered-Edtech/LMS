import { BookOpen, Medal, Star, Trophy } from 'lucide-react'
import { useMemo } from 'react'

import { EmptyState, Skeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

import { useGradebookEntries } from '../queries/useGradebook'
import type { GradebookEntry } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveLetter(pct: number): string {
  if (pct >= 90) return 'A'
  if (pct >= 80) return 'B'
  if (pct >= 70) return 'C'
  if (pct >= 60) return 'D'
  return 'F'
}

function letterColorClass(letter: string): string {
  switch (letter) {
    case 'A':
      return 'text-green-700 dark:text-green-400'
    case 'B':
      return 'text-blue-700 dark:text-blue-400'
    case 'C':
      return 'text-yellow-700 dark:text-yellow-400'
    case 'D':
      return 'text-orange-700 dark:text-orange-400'
    default:
      return 'text-red-700 dark:text-red-400'
  }
}

function letterBgClass(letter: string): string {
  switch (letter) {
    case 'A':
      return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
    case 'B':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
    case 'C':
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
    case 'D':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700'
    default:
      return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
  }
}

// ── Summary card ─────────────────────────────────────────────────────────────

interface SummaryProps {
  average: number
  rank: number
  totalStudents: number
}

function SummaryCard({ average, rank, totalStudents }: SummaryProps) {
  const letter = deriveLetter(average)

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5',
        letterBgClass(letter)
      )}
    >
      {/* Grade circle */}
      <div
        className={cn(
          'w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2',
          letterBgClass(letter)
        )}
      >
        <span className={cn('text-4xl font-black', letterColorClass(letter))}>{letter}</span>
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Ringkasan Nilai</p>
        <p className={cn('text-3xl font-black', letterColorClass(letter))}>{average.toFixed(1)}%</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rata-rata berdasarkan semua penilaian yang telah dinilai
        </p>
      </div>

      <div className="flex gap-4 sm:flex-col sm:items-end">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Peringkat {rank} / {totalStudents}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Star className="w-4 h-4 text-blue-500" />
          {letter === 'A'
            ? 'Nilai Tertinggi'
            : letter === 'B'
              ? 'Nilai Baik'
              : 'Perlu Ditingkatkan'}
        </div>
      </div>
    </div>
  )
}

// ── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: GradebookEntry }) {
  const letter = entry.grade_letter ?? (entry.score != null ? deriveLetter(entry.percentage) : null)

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/70 dark:hover:bg-slate-700/25 transition-colors">
      <td className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
              entry.item_type === 'quiz'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              {entry.item_title ?? (entry.item_type === 'quiz' ? 'Kuis' : 'Tugas')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {entry.item_type === 'quiz' ? 'Kuis' : 'Tugas'}
            </p>
          </div>
        </div>
      </td>

      <td className="p-3 sm:p-4 text-sm text-slate-500 dark:text-slate-400">
        {entry.graded_at
          ? new Date(entry.graded_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </td>

      <td className="p-3 sm:p-4 text-center">
        {entry.score != null ? (
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {entry.score}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">Belum dinilai</span>
        )}
      </td>

      <td className="p-3 sm:p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        {entry.max_score}
      </td>

      <td className="p-3 sm:p-4 text-center">
        {letter ? (
          <span
            className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black border',
              letterBgClass(letter),
              letterColorClass(letter)
            )}
          >
            {letter}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
        )}
      </td>

      <td className="p-3 sm:p-4 text-sm text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
        {entry.notes ?? '—'}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  courseId: string
}

export function StudentGradeView({ courseId }: Props) {
  const { user } = useAuth()
  const { data: allEntries = [], isLoading } = useGradebookEntries(courseId)

  // Only show this student's entries
  const myEntries = useMemo(
    () => allEntries.filter((e) => e.student_id === user?.id),
    [allEntries, user]
  )

  // Compute my average
  const myAverage = useMemo(() => {
    // PERFORMANCE: Combine multiple array traversals into a single pass to reduce O(N) operations.
    let sum = 0
    let count = 0
    for (let i = 0; i < myEntries.length; i++) {
      const e = myEntries[i]
      if (e.score != null) {
        sum += e.percentage
        count++
      }
    }
    return count === 0 ? 0 : sum / count
  }, [myEntries])

  // Compute rank by averaging each student's entries
  const myRank = useMemo(() => {
    const studentTotals = new Map<string, { sum: number; count: number }>()
    for (const e of allEntries) {
      if (e.score == null) continue
      const prev = studentTotals.get(e.student_id) ?? { sum: 0, count: 0 }
      studentTotals.set(e.student_id, { sum: prev.sum + e.percentage, count: prev.count + 1 })
    }
    const averages = Array.from(studentTotals.entries()).map(([id, d]) => ({
      id,
      avg: d.count > 0 ? d.sum / d.count : 0,
    }))
    averages.sort((a, b) => b.avg - a.avg)
    const idx = averages.findIndex((a) => a.id === user?.id)
    return idx >= 0 ? idx + 1 : averages.length + 1
  }, [allEntries, user])

  const totalStudents = useMemo(() => {
    return new Set(allEntries.map((e) => e.student_id)).size
  }, [allEntries])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (myEntries.length === 0) {
    return (
      <EmptyState
        icon={<Medal className="w-12 h-12" />}
        title="Belum ada nilai"
        description="Nilai akan muncul setelah guru menginput atau menyinkronkan gradebook."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <SummaryCard average={myAverage} rank={myRank} totalStudents={totalStudents} />

      {/* Detail table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-slate-200">Rincian Penilaian</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Judul
                </th>
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Nilai
                </th>
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Maks
                </th>
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Huruf
                </th>
                <th className="p-3 sm:p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Catatan
                </th>
              </tr>
            </thead>
            <tbody>
              {myEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useVirtualizer } from '@tanstack/react-virtual'
import { Download, RefreshCw, Search } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { EmptyState, Skeleton } from '@/components/ui'
import { cn } from '@/utils/cn'

import { exportGradebookCSV } from '../api/gradebookApi'
import {
  useGradebookEntries,
  useSyncGradebook,
  useUpdateGradebookEntry,
} from '../queries/useGradebook'
import type { GradebookColumn, GradebookEntry, GradebookStudent } from '../types'

// ── Grade helpers ─────────────────────────────────────────────────────────────

function letterColor(letter: string | null): string {
  switch (letter) {
    case 'A':
      return 'text-green-700 dark:text-green-400'
    case 'B':
      return 'text-blue-700 dark:text-blue-400'
    case 'C':
      return 'text-yellow-700 dark:text-yellow-400'
    case 'D':
      return 'text-orange-700 dark:text-orange-400'
    case 'F':
      return 'text-red-700 dark:text-red-400'
    default:
      return 'text-slate-400 dark:text-slate-500'
  }
}

function letterBg(letter: string | null): string {
  switch (letter) {
    case 'A':
      return 'bg-green-50 dark:bg-green-900/25'
    case 'B':
      return 'bg-blue-50 dark:bg-blue-900/25'
    case 'C':
      return 'bg-yellow-50 dark:bg-yellow-900/25'
    case 'D':
      return 'bg-orange-50 dark:bg-orange-900/25'
    case 'F':
      return 'bg-red-50 dark:bg-red-900/25'
    default:
      return 'bg-slate-50 dark:bg-slate-800/50'
  }
}

// ── Build matrix helpers ──────────────────────────────────────────────────────

function buildColumns(entries: GradebookEntry[]): GradebookColumn[] {
  const seen = new Map<string, GradebookColumn>()
  for (const e of entries) {
    const colId = e.quiz_id ?? e.assignment_id
    if (colId && !seen.has(colId)) {
      seen.set(colId, {
        id: colId,
        title: e.item_title ?? colId,
        type: e.item_type ?? 'assignment',
        max_score: e.max_score,
      })
    }
  }
  return Array.from(seen.values())
}

function buildStudentRows(
  entries: GradebookEntry[],
  columns: GradebookColumn[]
): GradebookStudent[] {
  const studentMap = new Map<
    string,
    { name: string; email: string; grades: Record<string, GradebookEntry | null> }
  >()

  for (const e of entries) {
    if (!studentMap.has(e.student_id)) {
      studentMap.set(e.student_id, {
        name: e.student_name ?? e.student_id,
        email: e.student_email ?? '',
        grades: Object.fromEntries(columns.map((c) => [c.id, null])),
      })
    }
    const colId = e.quiz_id ?? e.assignment_id
    if (colId) {
      studentMap.get(e.student_id)!.grades[colId] = e
    }
  }

  const result: GradebookStudent[] = []

  // ⚡ Perf: consolidate multiple chained passes (.filter then .reduce) into a single, standard for loop to minimize CPU overhead and O(N) operations in performance-critical code.
  for (const [id, s] of studentMap.entries()) {
    let sum = 0
    let count = 0
    for (let i = 0; i < columns.length; i++) {
      const grade = s.grades[columns[i].id]
      if (grade?.score != null) {
        sum += grade.percentage ?? 0
        count++
      }
    }
    const avg = count > 0 ? sum / count : 0
    result.push({ id, name: s.name, email: s.email, grades: s.grades, average: avg })
  }

  return result
}

function deriveLetter(avg: number): string {
  if (avg >= 90) return 'A'
  if (avg >= 80) return 'B'
  if (avg >= 70) return 'C'
  if (avg >= 60) return 'D'
  return 'F'
}

// ── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
          <td className="p-3 sticky left-0 bg-white dark:bg-slate-800">
            <Skeleton className="h-4 w-36" />
          </td>
          {Array.from({ length: cols + 1 }).map((__, j) => (
            <td key={j} className="p-3 text-center">
              <Skeleton className="h-4 w-12 mx-auto" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  courseId: string
}

export function GradebookTable({ courseId }: Props) {
  const { data: entries = [], isLoading } = useGradebookEntries(courseId)
  const syncMutation = useSyncGradebook()
  const updateMutation = useUpdateGradebookEntry()

  const [search, setSearch] = useState('')
  const [editingCell, setEditingCell] = useState<{ studentId: string; colId: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const columns = useMemo(() => buildColumns(entries), [entries])
  const students = useMemo(() => buildStudentRows(entries, columns), [entries, columns])

  const filteredStudents = useMemo(
    () =>
      search.trim()
        ? students.filter(
            (s) =>
              s.name.toLowerCase().includes(search.toLowerCase()) ||
              s.email.toLowerCase().includes(search.toLowerCase())
          )
        : students,
    [students, search]
  )

  // Class-average per column
  const colAverages = useMemo(() => {
    return columns.map((col) => {
      const graded = students.filter((s) => s.grades[col.id]?.score != null)
      if (graded.length === 0) return null
      return graded.reduce((sum, s) => sum + (s.grades[col.id]?.percentage ?? 0), 0) / graded.length
    })
  }, [columns, students])

  const tableBodyRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => tableBodyRef.current!,
    estimateSize: () => 52, // Row height
    overscan: 5,
  })

  const handleCellClick = useCallback(
    (studentId: string, colId: string, currentScore: number | null) => {
      setEditingCell({ studentId, colId })
      setEditValue(currentScore != null ? String(currentScore) : '')
    },
    []
  )

  const handleSaveCell = useCallback(() => {
    if (!editingCell) return
    const { studentId, colId } = editingCell

    // Find the entry id
    const entry = entries.find(
      (e) => e.student_id === studentId && (e.quiz_id === colId || e.assignment_id === colId)
    )
    if (!entry) {
      setEditingCell(null)
      return
    }

    const parsed = editValue === '' ? null : parseFloat(editValue)
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setEditingCell(null)
      return
    }

    updateMutation.mutate({ id: entry.id, courseId, updates: { score: parsed } })
    setEditingCell(null)
  }, [editingCell, editValue, entries, updateMutation, courseId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSaveCell()
      if (e.key === 'Escape') setEditingCell(null)
    },
    [handleSaveCell]
  )

  const handleExport = useCallback(() => {
    exportGradebookCSV(entries, columns)
  }, [entries, columns])

  const handleSync = useCallback(() => {
    syncMutation.mutate(courseId)
  }, [syncMutation, courseId])

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="gradebook-search-input"
            type="text"
            placeholder="Cari siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="gradebook-sync-button"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all',
              'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', syncMutation.isPending && 'animate-spin')} />
            Sinkronkan
          </button>

          <button
            data-testid="gradebook-export-button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all',
              'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600',
              'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          data-testid="gradebook-table"
          className="w-full text-left border-collapse min-w-[600px]"
          aria-label="Tabel nilai kelas"
        >
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[180px]">
                Siswa
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center min-w-[120px]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="truncate max-w-[110px]" title={col.title}>
                      {col.title}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        col.type === 'quiz'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      )}
                    >
                      {col.type === 'quiz' ? 'Kuis' : 'Tugas'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">
                      / {col.max_score}
                    </span>
                  </div>
                </th>
              ))}
              <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center min-w-[90px]">
                Rata-rata
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {isLoading ? (
              <SkeletonRows cols={columns.length} />
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="p-8">
                  <EmptyState
                    title="Belum ada data nilai"
                    description="Sinkronkan gradebook atau tambahkan nilai secara manual."
                  />
                </td>
              </tr>
            ) : (
              <div ref={tableBodyRef} style={{ height: '400px', overflow: 'auto' }}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const student = filteredStudents[virtualRow.index!]
                    return (
                      <div
                        key={student.id}
                        style={{
                          position: 'absolute',
                          top: virtualRow.start,
                          height: virtualRow.size,
                          width: '100%',
                        }}
                      >
                        <tr
                          key={student.id}
                          className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          {/* Student name — sticky */}
                          <td className="p-3 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-700/30 z-10">
                            <div>
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                {student.name}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {student.email}
                              </p>
                            </div>
                          </td>

                          {/* Grade cells */}
                          {columns.map((col) => {
                            const entry = student.grades[col.id]
                            const isEditing =
                              editingCell?.studentId === student.id && editingCell?.colId === col.id
                            const letter = entry?.grade_letter ?? null

                            return (
                              <td key={col.id} className="p-2 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    min={0}
                                    max={col.max_score}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveCell}
                                    onKeyDown={handleKeyDown}
                                    className="w-16 text-center border-2 border-blue-500 rounded-lg py-1 text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  />
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleCellClick(student.id, col.id, entry?.score ?? null)
                                    }
                                    className={cn(
                                      'w-16 h-8 rounded-lg text-sm font-semibold transition-all',
                                      'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1',
                                      letter
                                        ? letterBg(letter)
                                        : 'bg-slate-50 dark:bg-slate-700/50',
                                      letter
                                        ? letterColor(letter)
                                        : 'text-slate-400 dark:text-slate-500'
                                    )}
                                  >
                                    {entry?.score != null ? entry.score : '—'}
                                  </button>
                                )}
                              </td>
                            )
                          })}

                          {/* Average */}
                          <td className="p-2 text-center">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-16 h-8 rounded-lg text-sm font-bold',
                                student.average > 0
                                  ? letterBg(deriveLetter(student.average))
                                  : 'bg-slate-50 dark:bg-slate-700/50',
                                student.average > 0
                                  ? letterColor(deriveLetter(student.average))
                                  : 'text-slate-400 dark:text-slate-500'
                              )}
                            >
                              {student.average > 0 ? `${student.average.toFixed(0)}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </tbody>

          {/* Footer: class averages */}
          {!isLoading && filteredStudents.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-600">
                <td className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-900 uppercase tracking-wider">
                  Rata-rata Kelas
                </td>
                {colAverages.map((avg, i) => {
                  const letter = avg != null ? deriveLetter(avg) : null
                  return (
                    <td key={columns[i].id} className="p-2 text-center">
                      {avg != null ? (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-16 h-7 rounded-lg text-xs font-bold',
                            letterBg(letter),
                            letterColor(letter)
                          )}
                        >
                          {avg.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      )}
                    </td>
                  )
                })}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

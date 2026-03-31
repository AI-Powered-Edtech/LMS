import { Edit2, MoreVertical, Save, Search, Users, X } from 'lucide-react'

import { EmptyState, OptimizedImage } from '@/src/components/ui'
import type { Assignment } from '@/src/features/gradebook/hooks/useGradebookQueries'
import {
  getGradeBg,
  getGradeColor,
  getTypeColor,
  getTypeLabel,
} from '@/src/features/gradebook/hooks/useGradebookState'
import { cn } from '@/src/utils/cn'

interface GradeEntry {
  score: number | null
}

interface Student {
  id: string
  name: string
  nis: string
}

interface GradebookMainTableProps {
  filteredStudents: Student[]
  assignments: Assignment[]
  grades: Record<string, Record<string, GradeEntry>>
  studentStatsMap: Map<string, { average: number; total: number }>
  editingCell: { studentId: string; assignmentId: string } | null
  editValue: string
  searchQuery: string
  onSearchChange: (query: string) => void
  onCellClick: (studentId: string, assignmentId: string, currentScore: number | null) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditValueChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export function GradebookMainTable({
  filteredStudents,
  assignments,
  grades,
  studentStatsMap,
  editingCell,
  editValue,
  searchQuery,
  onSearchChange,
  onCellClick,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onKeyDown,
}: GradebookMainTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa atau NIS..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari siswa atau NIS"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Tampilkan:
          </span>
          <select className="text-sm border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-blue-500 py-1.5 pl-3 pr-8 text-slate-900 dark:text-white">
            <option>Semua Tugas</option>
            <option>Kuis Saja</option>
            <option>Esai Saja</option>
            <option>Proyek Saja</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse min-w-[800px]"
          aria-label="Tabel nilai siswa"
        >
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <th className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-64">
                Siswa
              </th>
              <th className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm text-center w-24">
                Total Skor
              </th>
              <th className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm text-center w-24">
                Rata-rata
              </th>
              {assignments.map((assignment) => (
                <th
                  key={assignment.id}
                  className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm text-center min-w-[140px]"
                >
                  <div className="flex flex-col items-center">
                    <span className="truncate w-full" title={assignment.title}>
                      {assignment.title}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                      {assignment.date} • {assignment.maxScore} pts
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full mt-1',
                        getTypeColor(assignment.type)
                      )}
                    >
                      {getTypeLabel(assignment.type)}
                    </span>
                  </div>
                </th>
              ))}
              <th className="p-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredStudents.map((student) => {
              const stats = studentStatsMap.get(student.id)
              const avg = stats?.average ?? 0
              const total = stats?.total ?? 0
              return (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group"
                >
                  <td className="p-4 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-700/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        <OptimizedImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                          alt={student.name}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {student.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {student.nis}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                    {total}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm font-bold',
                        getGradeBg(avg),
                        getGradeColor(avg)
                      )}
                    >
                      {avg}%
                    </span>
                  </td>
                  {assignments.map((assignment) => {
                    const score = grades[student.id]?.[assignment.id] ?? null
                    const isEditing =
                      editingCell?.studentId === student.id &&
                      editingCell?.assignmentId === assignment.id

                    return (
                      <td key={assignment.id} className="p-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              autoFocus
                              value={editValue}
                              onChange={(e) => onEditValueChange(e.target.value)}
                              onKeyDown={onKeyDown}
                              className="w-16 px-2 py-1 text-center border-2 border-blue-500 rounded-md text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={onSaveEdit}
                              aria-label="Simpan nilai"
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              aria-label="Batalkan pengeditan"
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            className="relative group/cell inline-flex items-center justify-center w-16 h-8 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            onClick={() =>
                              onCellClick(student.id, assignment.id, score?.score ?? null)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ')
                                onCellClick(student.id, assignment.id, score?.score ?? null)
                            }}
                          >
                            {score && score.score !== null ? (
                              <span className={cn('text-sm', getGradeColor(score.score))}>
                                {score.score}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300 dark:text-slate-600">-</span>
                            )}
                            <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-600/50 rounded-md opacity-0 group-hover/cell:opacity-100 flex items-center justify-center transition-opacity">
                              <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      aria-label="Opsi lainnya"
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={assignments.length + 4} className="p-8">
                  <EmptyState
                    icon={<Users className="w-12 h-12" />}
                    title="Belum ada siswa"
                    description="Siswa akan muncul setelah mereka bergabung ke kelas."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

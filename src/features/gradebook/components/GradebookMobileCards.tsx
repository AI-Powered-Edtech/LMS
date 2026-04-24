/**
 * Gradebook Mobile Cards Component
 *
 * Mobile-first card-based layout for gradebook (replaces table on screens < 768px).
 *
 * Features:
 * - Card-based layout optimized for mobile viewing
 * - Collapsible assignment list per student
 * - Color-coded grade badges
 * - Inline editing support
 * - Search and filter integration
 * - Smooth animations
 */

import { ChevronDown, ChevronUp, Edit2, Save, User, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { formatDate as formatDateId } from '@/shared/utils/format-id'
import { cn } from '@/utils/cn'

import type { GradebookEntry } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MobileGradebookCardsProps {
  students: Array<{
    id: string
    name: string
    email?: string
    nis?: string
    avatarSeed?: string
  }>
  assignments: Array<{
    id: string
    title: string
    type: 'quiz' | 'assignment'
    maxScore: number
    date?: string
  }>
  grades: Record<string, Record<string, GradebookEntry | null>>
  searchQuery?: string
  filterType?: string
  onEditGrade?: (entryId: string, newScore: number) => void
  className?: string
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function getGradeColor(percentage: number): string {
  if (percentage >= 85)
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  if (percentage >= 70) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  if (percentage >= 60)
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

function getGradeLetter(percentage: number): string {
  if (percentage >= 85) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  return 'D'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    quiz: 'Kuis',
    assignment: 'Tugas',
    essay: 'Esai',
    project: 'Proyek',
  }
  return labels[type] || type
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const out = formatDateId(dateStr, { day: 'numeric', month: 'short' })
  return out === '—' ? '' : out
}

// ─── Student Card Component ───────────────────────────────────────────────────

function StudentCard({
  student,
  assignments,
  grades,
  onEditGrade,
}: {
  student: MobileGradebookCardsProps['students'][0]
  assignments: MobileGradebookCardsProps['assignments']
  grades: Record<string, GradebookEntry | null>
  onEditGrade?: (entryId: string, newScore: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Calculate average
  const gradedAssignments = assignments.filter(
    (a) => grades[a.id]?.score !== undefined && grades[a.id]?.score !== null
  )
  const totalPercentage = gradedAssignments.reduce((sum, a) => {
    const entry = grades[a.id]
    if (!entry || !entry.score || entry.max_score === 0) return sum
    return sum + (entry.score / entry.max_score) * 100
  }, 0)
  const average = gradedAssignments.length > 0 ? totalPercentage / gradedAssignments.length : 0

  const handleEdit = (entryId: string, currentScore?: number | null) => {
    setEditingId(entryId)
    setEditValue(currentScore?.toString() || '')
  }

  const handleSave = (entryId: string) => {
    const score = parseFloat(editValue)
    if (!isNaN(score) && onEditGrade) {
      onEditGrade(entryId, score)
      setEditingId(null)
      setEditValue('')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden"
    >
      {/* Card Header - Student Info */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>

            {/* Student Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {student.name}
              </h3>
              {student.nis && (
                <p className="text-xs text-slate-500 dark:text-slate-400">NIS: {student.nis}</p>
              )}
              {student.email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {student.email}
                </p>
              )}
            </div>
          </div>

          {/* Average Badge */}
          <div className="shrink-0">
            <div className={cn('px-3 py-1.5 rounded-lg text-sm font-bold', getGradeColor(average))}>
              {average > 0 ? getGradeLetter(average) : '-'}
            </div>
            {average > 0 && (
              <p className="text-xs text-center mt-1 text-slate-500 dark:text-slate-400">
                {average.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Assignments Summary */}
      <div className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <span>Nilai Tugas ({assignments.length})</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {assignments.map((assignment) => {
                  const entry = grades[assignment.id]
                  const hasGrade = entry?.score !== undefined && entry?.score !== null
                  const percentage =
                    hasGrade && entry.max_score > 0 && entry.score
                      ? (entry.score / entry.max_score) * 100
                      : 0

                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {assignment.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                            {getTypeLabel(assignment.type)}
                          </span>
                          {assignment.date && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(assignment.date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grade Display/Edit */}
                      <div className="ml-3 shrink-0">
                        {editingId === assignment.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              min={0}
                              max={assignment.maxScore}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(assignment.id)
                                if (e.key === 'Escape') handleCancel()
                              }}
                            />
                            <button
                              onClick={() => handleSave(assignment.id)}
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : hasGrade ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'px-2 py-1 rounded text-sm font-bold',
                                getGradeColor(percentage)
                              )}
                            >
                              {entry.score}/{assignment.maxScore}
                            </span>
                            {onEditGrade && (
                              <button
                                onClick={() => handleEdit(assignment.id, entry.score)}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GradebookMobileCards({
  students,
  assignments,
  grades,
  searchQuery = '',
  filterType,
  onEditGrade,
  className,
}: MobileGradebookCardsProps) {
  // Filter students based on search query
  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase()
    return (
      student.name.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.nis?.toLowerCase().includes(query)
    )
  })

  // Filter assignments based on type
  const filteredAssignments =
    filterType && filterType !== 'all'
      ? assignments.filter((a) => {
          if (filterType === 'quiz') return a.type === 'quiz'
          if (filterType === 'assignment') return a.type === 'assignment'
          return true
        })
      : assignments

  if (filteredStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Tidak ada siswa yang ditemukan</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <AnimatePresence>
        {filteredStudents.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            assignments={filteredAssignments}
            grades={grades[student.id] || {}}
            onEditGrade={onEditGrade}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default GradebookMobileCards

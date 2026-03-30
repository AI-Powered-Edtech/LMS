import { Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { Classroom, classroomService } from '@/src/features/classroom/api/classroomService'
import { QuizAssignment, quizService } from '@/src/features/quizzes'
import { useToast } from '@/src/hooks/useToast'
import { cn } from '@/src/utils/cn'

interface QuizAssignModalProps {
  quizId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface AssignmentFormState {
  selected: boolean
  availableFrom: string
  dueAt: string
  maxAttempts: string
  existingAssignmentId?: string
}

const toLocalDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function QuizAssignModal({ quizId, isOpen, onClose, onSuccess }: QuizAssignModalProps) {
  const { addToast } = useToast()
  const { user, tenantId } = useAuth()
  const [classes, setClasses] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, AssignmentFormState>>({})

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOpen && user && tenantId) {
      loadClasses()
    }
  }, [isOpen, quizId, user, tenantId])
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadClasses = async () => {
    if (!user || !tenantId) return

    setIsLoading(true)
    try {
      const [fetchedClasses, existingAssignments] = (await Promise.all([
        classroomService.fetchClassrooms(user.id, 'teacher', tenantId),
        quizService.getAssignmentsByQuiz(quizId, tenantId),
      ])) as [Classroom[], QuizAssignment[]]

      const existingByClassId = new Map(
        existingAssignments.map((assignment) => [assignment.class_id, assignment])
      )

      const initialAssignments: Record<string, AssignmentFormState> = {}
      fetchedClasses.forEach((classroom) => {
        const existing = existingByClassId.get(classroom.id)
        initialAssignments[classroom.id] = {
          selected: !!existing,
          availableFrom: toLocalDateTime(existing?.available_from),
          dueAt: toLocalDateTime(existing?.due_at),
          maxAttempts: existing?.max_attempts ? String(existing.max_attempts) : '',
          existingAssignmentId: existing?.id,
        }
      })

      setClasses(fetchedClasses)
      setAssignments(initialAssignments)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load classes', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async () => {
    const selectedAssignments = Object.entries(assignments)
      .filter(([, config]) => config.selected)
      .map(([classId, config]) => ({
        class_id: classId,
        available_from: config.availableFrom || undefined,
        due_at: config.dueAt || undefined,
        max_attempts: config.maxAttempts ? Number(config.maxAttempts) : null,
      }))

    if (selectedAssignments.length === 0 || !tenantId) return

    setIsSubmitting(true)
    try {
      await quizService.assignQuizToClasses(quizId, tenantId, selectedAssignments)
      onSuccess()
      onClose()
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to assign quiz', error)
      addToast({ type: 'error', message: 'Gagal menugaskan kuis. Silakan coba lagi.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tugaskan Kuis ke Kelas"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-slate-900/50 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Tugaskan Kuis ke Kelas
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((classroom) => (
                <div
                  key={classroom.id}
                  className={cn(
                    'bg-white dark:bg-slate-700 border rounded-xl p-4 transition-colors',
                    assignments[classroom.id]?.selected
                      ? 'border-blue-500 shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-600'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      checked={assignments[classroom.id]?.selected || false}
                      onChange={(e) =>
                        setAssignments((prev) => ({
                          ...prev,
                          [classroom.id]: {
                            ...prev[classroom.id],
                            selected: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-800 dark:text-white">
                          {classroom.name}
                        </div>
                        {assignments[classroom.id]?.existingAssignmentId && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                            Existing
                          </span>
                        )}
                      </div>

                      {assignments[classroom.id]?.selected && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Tersedia Dari
                            </label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
                              value={assignments[classroom.id].availableFrom}
                              onChange={(e) =>
                                setAssignments((prev) => ({
                                  ...prev,
                                  [classroom.id]: {
                                    ...prev[classroom.id],
                                    availableFrom: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Tenggat Waktu
                            </label>
                            <input
                              type="datetime-local"
                              className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
                              value={assignments[classroom.id].dueAt}
                              onChange={(e) =>
                                setAssignments((prev) => ({
                                  ...prev,
                                  [classroom.id]: {
                                    ...prev[classroom.id],
                                    dueAt: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Maks Percobaan
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg"
                              value={assignments[classroom.id].maxAttempts}
                              onChange={(e) =>
                                setAssignments((prev) => ({
                                  ...prev,
                                  [classroom.id]: {
                                    ...prev[classroom.id],
                                    maxAttempts: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Ikuti default kuis"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleAssign}
            disabled={
              isSubmitting || !Object.values(assignments).some((assignment) => assignment.selected)
            }
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Simpan Assignment
          </button>
        </div>
      </div>
    </div>
  )
}

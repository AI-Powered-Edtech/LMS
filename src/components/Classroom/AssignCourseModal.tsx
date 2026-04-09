import { Check, Loader2, School, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { Classroom, classroomService } from '@/features/classroom/api/classroomService'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

interface AssignCourseModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseTitle: string
}

export function AssignCourseModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
}: AssignCourseModalProps) {
  const { addToast } = useToast()
  const { user, tenantId } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOpen && user?.id) {
      void loadData()
    }
  }, [isOpen, user?.id, courseId])
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all classrooms taught by this teacher
      if (!tenantId) throw new Error('Tenant ID not found')
      const allClassrooms = await classroomService.fetchClassrooms(user!.id, 'teacher', tenantId)
      setClassrooms(allClassrooms)

      // Fetch currently assigned classes for this course
      const currentAssignments = await classroomService.fetchAssignedClassesForCourse(courseId)
      setAssignedClassIds(currentAssignments)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to load classes for assignment:', err)
      setError('Gagal memuat daftar kelas.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleClass = async (classId: string) => {
    if (saving) return

    const isCurrentlyAssigned = assignedClassIds.includes(classId)

    try {
      setSaving(true)
      if (isCurrentlyAssigned) {
        await classroomService.unassignCourseFromClass(courseId, classId, tenantId!)
        setAssignedClassIds((prev) => prev.filter((id) => id !== classId))
      } else {
        if (!tenantId) throw new Error('Tenant ID not found')
        await classroomService.assignCourseToClass(courseId, classId, tenantId)
        setAssignedClassIds((prev) => [...prev, classId])
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to toggle class assignment:', err)
      addToast({ type: 'error', message: 'Gagal memperbarui penugasan kelas.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <School className="w-5 h-5 text-indigo-500" />
                  Tugaskan ke Kelas
                </h2>
                <p className="text-sm text-slate-500 mt-1 truncate max-w-[300px]">{courseTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p className="text-slate-500 text-sm">Memuat daftar kelas...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-center text-sm">
                  {error}
                </div>
              ) : classrooms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-900 dark:text-white font-medium">Belum ada kelas</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Buat kelas terlebih dahulu untuk menugaskan materi ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Pilih kelas yang akan mendapatkan akses materi ini:
                  </p>
                  {classrooms.map((cls) => {
                    const isAssigned = assignedClassIds.includes(cls.id)
                    return (
                      <button
                        key={cls.id}
                        onClick={() => handleToggleClass(cls.id)}
                        disabled={saving}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group text-left',
                          isAssigned
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm',
                              isAssigned
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50'
                            )}
                          >
                            <School className="w-6 h-6" />
                          </div>
                          <div>
                            <p
                              className={cn(
                                'font-bold transition-colors',
                                isAssigned
                                  ? 'text-indigo-900 dark:text-indigo-200'
                                  : 'text-slate-900 dark:text-white'
                              )}
                            >
                              {cls.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {cls.join_code} • {cls.student_count || 0} Siswa
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                            isAssigned
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'border-slate-200 dark:border-slate-700 group-hover:border-indigo-400'
                          )}
                        >
                          {isAssigned && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

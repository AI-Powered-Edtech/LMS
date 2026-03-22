import { useState, useEffect } from 'react'
import { quizService, QuizAssignment } from '@/src/features/quizzes'
import { Loader2, Plus, AlertCircle, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useAuth } from '@/src/contexts/AuthContext'
import { useToast } from '@/src/hooks/useToast'

interface QuizAssignmentStatusProps {
  quizId: string
  onAssignClick: () => void
}

export function QuizAssignmentStatus({ quizId, onAssignClick }: QuizAssignmentStatusProps) {
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const [assignments, setAssignments] = useState<QuizAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAssignments = async () => {
    if (!tenantId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await quizService.getAssignmentsByQuiz(quizId, tenantId)
      setAssignments(data)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Failed to load assignments:', err)
      setError(err instanceof Error ? err.message : 'Gagal memuat status assignment')
    } finally {
      setIsLoading(false)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadAssignments()
  }, [quizId, tenantId])
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!tenantId) return
    if (
      !confirm(
        'Hapus assignment untuk kelas ini? Siswa di kelas tersebut tidak akan bisa mengakses kuis ini lagi.'
      )
    )
      return

    try {
      await quizService.removeQuizAssignment(assignmentId, tenantId)
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal menghapus assignment: ' + (err instanceof Error ? err.message : 'Unknown error'),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="ml-2 text-sm">Memuat status...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Status Assignment
        </h3>
        <button
          onClick={onAssignClick}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Assign ke Kelas
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-sm text-slate-500 font-medium">Belum di-assign ke kelas manapun.</p>
          <p className="text-xs text-slate-400 mt-1">
            Klik tombol di atas untuk menyebarkan kuis ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const statusColors = {
              active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
              scheduled: 'bg-amber-100 text-amber-700 border-amber-200',
              ended: 'bg-slate-100 text-slate-700 border-slate-200',
              draft: 'bg-slate-100 text-slate-500 border-slate-200',
            }

            const statusLabels = {
              active: 'Aktif',
              scheduled: 'Dijadwalkan',
              ended: 'Berakhir',
              draft: 'Draft',
            }

            const now = new Date()
            let displayStatus = assignment.status
            if (displayStatus === 'active') {
              if (assignment.available_from && new Date(assignment.available_from) > now) {
                displayStatus = 'scheduled'
              } else if (assignment.due_at && new Date(assignment.due_at) < now) {
                displayStatus = 'ended'
              }
            }

            return (
              <div
                key={assignment.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-white shadow-sm"
              >
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    {(assignment as unknown as { classes?: { name: string } }).classes?.name ||
                      'Kelas Tidak Diketahui'}
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColors[displayStatus as keyof typeof statusColors]}`}
                    >
                      {statusLabels[displayStatus as keyof typeof statusLabels]}
                    </span>
                  </h4>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {assignment.available_from
                        ? format(new Date(assignment.available_from), 'd MMM yyyy HH:mm', {
                            locale: id,
                          })
                        : 'Mulai sekarang'}
                    </div>
                    <span>—</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {assignment.due_at
                        ? format(new Date(assignment.due_at), 'd MMM yyyy HH:mm', { locale: id })
                        : 'Tidak ada batas'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

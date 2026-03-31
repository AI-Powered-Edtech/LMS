import { Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import { useToast } from '@/src/components/ui'

import { TeacherGroupEntry } from '../../api/groupAssignmentService'
import { useGradeGroupSubmission } from '../../hooks/useGroupAssignments'

interface Props {
  group: TeacherGroupEntry
  assignmentId: string
  onClose: () => void
}

export function GradeGroupModal({ group, assignmentId, onClose }: Props) {
  const addToast = useToast((s) => s.addToast)
  const gradeMutation = useGradeGroupSubmission(assignmentId)
  const [grade, setGrade] = useState<string>(group.grade !== null ? String(group.grade) : '')
  const [feedback, setFeedback] = useState('')

  const handleSubmit = async () => {
    const numGrade = parseFloat(grade)
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 100) {
      addToast({ type: 'error', message: 'Nilai harus antara 0 dan 100.' })
      return
    }

    if (group.submission_status !== 'submitted' && group.submission_status !== 'graded') {
      addToast({ type: 'error', message: 'Kelompok ini belum menyerahkan tugas.' })
      return
    }

    if (!group.submission_id) {
      addToast({ type: 'error', message: 'ID pengumpulan tidak ditemukan untuk kelompok ini.' })
      return
    }

    try {
      await gradeMutation.mutateAsync({
        submissionId: group.submission_id,
        grade: numGrade,
        feedback: feedback || undefined,
      })
      addToast({ type: 'success', message: `Kelompok ${group.group_name} berhasil dinilai.` })
      onClose()
    } catch {
      addToast({ type: 'error', message: 'Gagal menyimpan nilai. Coba lagi.' })
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Beri Nilai: ${group.group_name}`}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md p-6"
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Beri Nilai: {group.group_name}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {group.member_count} anggota
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="grade-input"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nilai (0–100)
            </label>
            <input
              id="grade-input"
              type="number"
              min={0}
              max={100}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="feedback-input"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Komentar (opsional)
            </label>
            <textarea
              id="feedback-input"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tulis komentar untuk kelompok..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={gradeMutation.isPending}
            className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={gradeMutation.isPending || !grade}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {gradeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan Nilai
          </button>
        </div>
      </motion.div>
    </div>
  )
}

import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState, OptimizedImage } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { AssignmentGradingQueue } from '@/features/assignments/api/assignmentService'
import type { AssignmentUiState } from '@/features/assignments/types'
import { PlagiarismCheckButton } from '@/features/plagiarism'

interface TeacherSubmissionsPanelProps {
  assignment: AssignmentUiState
  gradingQueue?: AssignmentGradingQueue | null
}

export function TeacherSubmissionsPanel({
  assignment,
  gradingQueue,
}: TeacherSubmissionsPanelProps) {
  const { tenantId } = useAuth()
  const submissions = gradingQueue?.students ?? assignment.studentSubmissions
  const submittedCount = submissions.filter(
    (submission: { status: string }) =>
      submission.status === 'submitted' ||
      submission.status === 'graded' ||
      submission.status === 'late'
  ).length

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg">Status Pengumpulan</h3>
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {submittedCount} / {submissions.length} Diserahkan
        </div>
      </div>
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="Belum ada submisi"
            description="Submisi siswa akan muncul di sini"
          />
        ) : (
          submissions.map((sub) => {
            const isQueueRow = 'submission_id' in sub
            const studentName = isQueueRow ? sub.student_name : sub.studentName
            const studentId = isQueueRow ? sub.student_id : sub.studentId
            const displayGrade = isQueueRow ? (sub.score ?? sub.raw_score ?? null) : sub.grade
            const isGraded = displayGrade !== null && displayGrade !== undefined

            return (
              <div
                key={isQueueRow ? sub.student_id : sub.id}
                className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                    <OptimizedImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${studentName}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {studentName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {sub.status === 'assigned' || sub.status === 'not_submitted'
                        ? 'Belum diserahkan'
                        : sub.status === 'submitted'
                          ? 'Diserahkan'
                          : sub.status === 'late'
                            ? 'Terlambat'
                            : 'Dinilai'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Plagiarism check — only for submitted/graded text submissions */}
                  {(sub.status === 'submitted' ||
                    sub.status === 'graded' ||
                    sub.status === 'late') &&
                    tenantId &&
                    isQueueRow &&
                    sub.submission_id && null}
                  {isGraded ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {displayGrade}/{assignment.maxGrade}
                    </span>
                  ) : sub.status === 'submitted' || sub.status === 'late' ? (
                    <Link
                      to={`/grader?assignmentId=${assignment.id}&studentId=${studentId}`}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Beri Nilai
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

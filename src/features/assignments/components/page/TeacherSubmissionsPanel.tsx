import { Link } from 'react-router-dom'

import { OptimizedImage } from '@/src/components/ui'
import type { AssignmentUiState } from '@/src/features/assignments/types'

interface TeacherSubmissionsPanelProps {
  assignment: AssignmentUiState
  getStudentGrade: (studentId: string, assignmentId: string) => { score: number | null } | null | undefined
}

export function TeacherSubmissionsPanel({
  assignment,
  getStudentGrade,
}: TeacherSubmissionsPanelProps) {
  const submissions = assignment.studentSubmissions || []
  const submittedCount = submissions.filter(
    (s: { status: string }) => s.status === 'submitted' || s.status === 'graded'
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
        {submissions.map((sub) => {
          const gradeEntry = getStudentGrade(String(sub.id), assignment.id)
          const displayGrade = gradeEntry?.score !== null ? gradeEntry?.score : sub.grade
          const isGraded = displayGrade !== null && displayGrade !== undefined

          return (
            <div
              key={sub.id}
              className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                  <OptimizedImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.studentName}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {sub.studentName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sub.status === 'assigned'
                      ? 'Belum diserahkan'
                      : sub.status === 'submitted'
                        ? 'Diserahkan'
                        : 'Dinilai'}
                  </p>
                </div>
              </div>
              {isGraded ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {displayGrade}/100
                </span>
              ) : sub.status === 'submitted' ? (
                <Link
                  to={`/grader?assignmentId=${assignment.id}&studentId=${sub.id}`}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Beri Nilai
                </Link>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

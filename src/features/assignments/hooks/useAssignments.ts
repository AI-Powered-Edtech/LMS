import { useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { assignmentService } from '@/features/assignments/api/assignmentService'

import { AssignmentAttemptUi, AssignmentUiState, StudentSubmission } from '../types'

// Raw database response type (snake_case from Supabase)
interface AssignmentDbResponse {
  id: string
  title: string
  description: string | null
  due_date: string | null
  available_from: string | null
  max_points: number
  max_attempts: number
  late_penalty_percent: number
  allow_text_submission: boolean
  allow_file_submission: boolean
  allow_link_submission: boolean
  reminder_enabled: boolean
  assignment_submissions: {
    id: string
    student_id: string
    status: string
    attempt_number: number
    score: number | null
    raw_score: number | null
    submitted_at: string | null
    submission_text: string | null
    file_url: string | null
    link_url: string | null
    is_late: boolean
    late_penalty_percent: number
    feedback: string | null
    user_profiles?: { full_name: string } | { full_name: string }[]
  }[]
}

function normalizeSubmissionStatus(status: string | null | undefined) {
  switch (status?.toUpperCase()) {
    case 'SUBMITTED':
      return 'submitted'
    case 'LATE':
      return 'late'
    case 'GRADED':
    case 'RETURNED':
      return 'graded'
    default:
      return 'assigned'
  }
}

function toAttemptUi(
  submission: AssignmentDbResponse['assignment_submissions'][number]
): AssignmentAttemptUi {
  const fileName = submission.file_url ? submission.file_url.split('/').pop() || 'file' : null

  return {
    id: submission.id,
    attemptNumber: submission.attempt_number ?? 1,
    status:
      submission.status?.toUpperCase() === 'GRADED'
        ? 'graded'
        : submission.status?.toUpperCase() === 'RETURNED'
          ? 'returned'
          : submission.status?.toUpperCase() === 'LATE'
            ? 'late'
            : submission.status?.toUpperCase() === 'SUBMITTED'
              ? 'submitted'
              : 'draft',
    submittedAt: submission.submitted_at,
    text: submission.submission_text ?? '',
    fileUrl: submission.file_url ?? null,
    fileName,
    linkUrl: submission.link_url ?? null,
    rawScore: submission.raw_score ?? null,
    grade: submission.score ?? null,
    feedback: submission.feedback ?? null,
    isLate: Boolean(submission.is_late),
    latePenaltyPercent: submission.late_penalty_percent ?? 0,
  }
}

export function useAssignments() {
  const { tenantId, user, role } = useAuth()
  const userId = user?.id
  const [assignments, setAssignments] = useState<AssignmentUiState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (tenantId && userId) {
      void loadAssignments()
    } else {
      setLoading(false)
    }
  }, [tenantId, userId, role])
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadAssignments = async () => {
    try {
      setError(null)
      setLoading(true)

      if (!tenantId) return

      let response
      if (role === 'teacher' || role === 'admin') {
        response = await assignmentService.getTeacherAssignments(tenantId)
      } else {
        response = await assignmentService.getStudentAssignments(tenantId)
      }

      // Handle both paginated and non-paginated responses for backward compatibility
      const data = Array.isArray(response) ? response : response?.data

      if (data) {
        // Map database response to UI state with proper typing
        const mapped = (data as any[]).map((a) => {
          const allSubmissions = [...(a.assignment_submissions || [])]
          const relevantSubmissions =
            role === 'student'
              ? allSubmissions.filter((submission) => submission.student_id === userId)
              : allSubmissions

          const submissions = relevantSubmissions.sort(
            (left, right) => (right.attempt_number ?? 0) - (left.attempt_number ?? 0)
          )

          const dbSubmission = submissions.length > 0 ? submissions[0] : null
          const attempts = submissions.map(toAttemptUi)

          // Derived status logic for student
          let status: AssignmentUiState['status'] = 'assigned'
          const now = new Date()
          const dueDate = a.due_date ? new Date(a.due_date) : null

          if (role === 'student') {
            if (dbSubmission?.score !== null && dbSubmission?.score !== undefined) {
              status = 'graded'
            } else if (dbSubmission?.status) {
              status = normalizeSubmissionStatus(dbSubmission.status)
            } else if (dueDate && dueDate < now) {
              status = 'late'
            } else {
              status = 'assigned'
            }
          } else {
            // Teacher view
            if (dueDate && dueDate < now) {
              status = 'late'
            }
          }

          const latestSubmission = dbSubmission ? toAttemptUi(dbSubmission) : null

          return {
            id: a.id,
            title: a.title,
            description: a.description || '',
            dueDate: a.due_date || new Date().toISOString(),
            availableFrom: a.available_from,
            maxGrade: a.max_points || 100,
            maxAttempts: a.max_attempts || 1,
            remainingAttempts: Math.max((a.max_attempts || 1) - submissions.length, 0),
            type: 'individual' as const,
            status,
            grade: latestSubmission?.grade ?? null,
            rawScore: latestSubmission?.rawScore ?? null,
            submittedAt: latestSubmission?.submittedAt ?? null,
            allowTextSubmission: a.allow_text_submission ?? true,
            allowFileSubmission: a.allow_file_submission ?? true,
            allowLinkSubmission: a.allow_link_submission ?? false,
            reminderEnabled: a.reminder_enabled ?? true,
            latePenaltyPercent: a.late_penalty_percent ?? 0,
            canResubmit:
              role === 'student' &&
              Math.max((a.max_attempts || 1) - submissions.length, 0) > 0 &&
              (!dueDate || dueDate >= now),
            attachments: [],
            comments: [],
            attempts,
            studentSubmissions:
              role === 'student'
                ? []
                : submissions.map(
                    (s): StudentSubmission => ({
                      id: s.id,
                      studentId: s.student_id,
                      studentName:
                        (s as unknown as { user_profiles?: { full_name: string } }).user_profiles
                          ?.full_name ||
                        user?.user_metadata?.full_name ||
                        'Siswa',
                      status: normalizeSubmissionStatus(s.status),
                      submittedAt: s.submitted_at,
                      grade: s.score,
                      rawScore: s.raw_score ?? null,
                      attemptNumber: s.attempt_number ?? 1,
                      linkUrl: s.link_url ?? null,
                      isLate: Boolean(s.is_late),
                      uploadedFiles: s.file_url
                        ? [
                            {
                              id: s.id,
                              name: s.file_url.split('/').pop() || 'file',
                              type: 'file',
                              url: s.file_url,
                            },
                          ]
                        : [],
                    })
                  ),
          }
        })
        setAssignments(mapped)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load assignments', err)
      setError('Gagal memuat tugas. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return { assignments, loading, error, refetch: loadAssignments, setAssignments }
}

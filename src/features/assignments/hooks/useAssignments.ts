import { useAuth } from '@/contexts/AuthContext'
import { useAssignmentList } from '../queries/assignmentQueries'
import { AssignmentUiState, AssignmentAttemptUi, StudentSubmission, Attachment } from '../types'

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
    user_profiles?: { full_name: string }[]
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
  const { data, isLoading, error, refetch } = useAssignmentList(tenantId as string)

  // Map the query result to the UI state
  const assignments =
    data?.data?.map((a) => {
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

      // Derived status logic
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
        dueDate: a.due_date ?? new Date().toISOString(),
        availableFrom: a.available_from,
        maxGrade: a.max_points ?? 100,
        maxAttempts: a.max_attempts ?? 1,
        remainingAttempts: Math.max((a.max_attempts ?? 1) - submissions.length, 0),
        type: 'individual' as AssignmentUiState['type'],
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
          Math.max((a.max_attempts ?? 1) - submissions.length, 0) > 0 &&
          (!dueDate || dueDate >= now),
        attachments: [] as Attachment[],
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
    }) ?? []

  return { assignments, loading: isLoading, error: error?.message ?? null, refetch }
}

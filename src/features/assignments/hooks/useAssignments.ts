import { useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { assignmentService } from '@/features/assignments/api/assignmentService'

import { AssignmentUiState, StudentSubmission } from '../types'

// Raw database response type (snake_case from Supabase)
interface AssignmentDbResponse {
  id: string
  title: string
  description: string | null
  due_date: string | null
  max_points: number
  assignment_submissions: {
    id: string
    status: string
    score: number | null
    submitted_at: string | null
    file_url: string | null
    user_profiles?: { full_name: string } | { full_name: string }[]
  }[]
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
      loadAssignments()
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
        const mapped = data.map((a: AssignmentDbResponse) => {
          const submissions = a.assignment_submissions || []

          // For student, there should be at most 1 submission because RLS filters by their user_id
          const dbSubmission = submissions.length > 0 ? submissions[0] : null

          // Derived status logic for student
          let status: AssignmentUiState['status'] = 'assigned'
          const now = new Date()
          const dueDate = a.due_date ? new Date(a.due_date) : null

          if (role === 'student') {
            if (dbSubmission?.score !== null && dbSubmission?.score !== undefined) {
              status = 'graded'
            } else if (dbSubmission?.submitted_at) {
              status = 'submitted'
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

          return {
            id: a.id,
            title: a.title,
            description: a.description || '',
            dueDate: a.due_date || new Date().toISOString(),
            maxGrade: a.max_points || 100,
            type: 'individual' as const,
            status,
            grade: null, // Grades are separate
            submittedAt: dbSubmission?.submitted_at ?? null,
            attachments: [],
            comments: [],
            studentSubmissions: submissions.map(
              (s): StudentSubmission => ({
                id: s.id,
                studentName:
                  (s as unknown as { user_profiles?: { full_name: string } }).user_profiles
                    ?.full_name ||
                  user?.user_metadata?.full_name ||
                  'Siswa',
                status: s.status as StudentSubmission['status'],
                submittedAt: s.submitted_at,
                grade: s.score,
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

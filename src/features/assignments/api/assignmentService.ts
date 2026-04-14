import { api, apiFetch } from '@/src/lib/api'
import { logDevError } from '@/src/utils/logDevError'

export interface Assignment {
  id: string
  tenant_id: string
  course_id: string
  lesson_id: string
  title: string
  instructions: string | null
  max_points: number
  max_attempts: number
  is_published: boolean
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AssignmentSubmission {
  id: string
  tenant_id: string
  assignment_id: string
  student_id: string
  submission_text: string | null
  file_url: string | null
  score: number | null
  feedback: string | null
  status: 'draft' | 'submitted' | 'graded' | 'returned'
  attempt_number: number
  submitted_at: string
  graded_at: string | null
  user_profiles?:
    | {
        full_name: string
        avatar_url?: string | null
      }
    | { full_name: string; avatar_url?: string | null }[]
}

// Explicit columns for assignment queries (no SELECT *)
const ASSIGNMENT_COLUMNS =
  'id, tenant_id, course_id, lesson_id, title, instructions, max_points, max_attempts, is_published, due_date, created_by, created_at, updated_at'

const SUBMISSION_COLUMNS =
  'id, tenant_id, assignment_id, student_id, submission_text, file_url, score, feedback, status, attempt_number, submitted_at, graded_at'

export const assignmentService = {
  /**
   * Creates a new assignment linked to a lesson.
   */
  async createAssignment(assignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await apiFetch('/assignments')

    if (error) {
      logDevError('assignmentService', 'Error creating assignment:', error)
      throw error
    }

    return data as Assignment
  },

  /**
   * Students submit their work.
   * Note: lesson_progress completion is handled by DB trigger.
   */
  async submitAssignment(
    submission: Omit<
      AssignmentSubmission,
      'id' | 'submitted_at' | 'graded_at' | 'score' | 'feedback' | 'status'
    >
  ) {
    const { data, error } = await apiFetch('/assignment_submissions')

    if (error) {
      logDevError('assignmentService', 'Error submitting assignment:', error)
      throw error
    }

    return data as AssignmentSubmission
  },

  /**
   * Teachers grade a submission.
   */
  async gradeSubmission(submissionId: string, tenantId: string, score: number, feedback: string) {
    const { data, error } = await apiFetch('/assignment_submissions')

    if (error) {
      logDevError('assignmentService', 'Error grading submission:', error)
      throw error
    }

    return data as AssignmentSubmission
  },

  /**
   * Fetches assignment details by lesson_id.
   */
  async getAssignmentByLesson(lessonId: string, tenantId: string) {
    const { data, error } = await apiFetch('/assignments')

    if (error) {
      logDevError('assignmentService', 'Error fetching assignment by lesson:', error)
      throw error
    }

    return data as Assignment | null
  },

  /**
   * Fetches assignment details along with student's current submission if any.
   */
  async getAssignmentDetails(assignmentId: string, studentId: string, tenantId: string) {
    const { data, error } = await apiFetch('/assignments')

    if (error) {
      logDevError('assignmentService', 'Error fetching assignment details:', error)
      throw error
    }

    return data
  },

  /**
   * Fetches all submissions for an assignment (for Teacher Gradebook).
   */
  async getAssignmentSubmissions(assignmentId: string, tenantId: string) {
    const { data, error } = await apiFetch('/assignment_submissions')

    if (error) {
      logDevError('assignmentService', 'Error fetching assignment submissions:', error)
      throw error
    }

    return data as AssignmentSubmission[]
  },

  /**
   * Fetches published assignments for a student to display in Pusat Tugas.
   * Only shows is_published=true assignments. Relies on RLS to filter
   * assignment_submissions by the current user's ID.
   */
  async getStudentAssignments(tenantId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await apiFetch('/assignments')

    if (error) {
      logDevError('assignmentService', 'Error fetching student assignments:', error)
      throw error
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    }
  },

  /**
   * Fetches all assignments for a teacher dashboard overview.
   * Includes pagination for scalability.
   */
  async getTeacherAssignments(tenantId: string, page = 1, limit = 20) {
    return this.getAssignments(tenantId, page, limit)
  },

  /**
   * Internal method to fetch assignments with submissions.
   * Supports pagination for scalability with large datasets.
   */
  async getAssignments(tenantId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await apiFetch('/assignments')

    if (error) {
      logDevError('assignmentService', 'Error fetching assignments:', error)
      throw error
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    }
  },

  /**
   * Upload an assignment submission file to storage and return its public URL.
   */
  async uploadSubmissionFile(
    file: File,
    tenantId: string,
    assignmentId: string,
    userId: string
  ): Promise<string> {
    const storagePath = `${tenantId}/assignments/${assignmentId}/${userId}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await api.storage
      .from('assignment-submissions')
      .upload(storagePath, file, { upsert: false })
    if (uploadError) throw uploadError
    const { data: publicData } = api.storage
      .from('assignment-submissions')
      .getPublicUrl(uploadData?.path || '')
    return publicData?.publicUrl || uploadData?.path || ''
  },
}

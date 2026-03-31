import { supabase } from '@/services/supabase/client'
import { logDevError } from '@/utils/logDevError'

export interface Assignment {
  id: string
  tenant_id: string
  course_id: string | null
  lesson_id: string | null
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
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select(ASSIGNMENT_COLUMNS)
      .single()

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
    const { data, error } = await supabase
      .from('assignment_submissions')
      .upsert({
        ...submission,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select(SUBMISSION_COLUMNS)
      .single()

    if (error) {
      logDevError('assignmentService', 'Error submitting assignment:', error)
      throw error
    }

    return data as AssignmentSubmission
  },

  /**
   * Students unsubmit their work.
   */
  async unsubmitAssignment(assignmentId: string, studentId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        status: 'draft',
        submitted_at: null,
      })
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .select(SUBMISSION_COLUMNS)
      .single()
    if (error) {
      throw error
    }
    return data as AssignmentSubmission
  },
  /**
   * Teachers grade a submission.
   */
  async gradeSubmission(submissionId: string, tenantId: string, score: number, feedback: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        score,
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .eq('tenant_id', tenantId)
      .select(SUBMISSION_COLUMNS)
      .single()

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
    const { data, error } = await supabase
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('lesson_id', lessonId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

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
    const { data, error } = await supabase
      .from('assignments')
      .select(
        `
                ${ASSIGNMENT_COLUMNS},
                assignment_submissions!left (
                    ${SUBMISSION_COLUMNS}
                )
            `
      )
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId)
      .eq('assignment_submissions.student_id', studentId)
      .single()

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
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(
        `
                ${SUBMISSION_COLUMNS},
                user_profiles:student_id (
                    full_name,
                    avatar_url
                )
            `
      )
      .eq('assignment_id', assignmentId)
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false })
      .limit(200)

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

    const { data, error, count } = await supabase
      .from('assignments')
      .select(
        `
                ${ASSIGNMENT_COLUMNS},
                assignment_submissions!left (
                    id,
                    status,
                    score,
                    submitted_at,
                    file_url
                )
            `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .eq('is_published', true)
      .order('due_date', { ascending: true })
      .range(from, to)

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
   * Fetches all assignments for a tenant (used by AssignmentGradebook).
   * Returns a flat list ordered by created_at.
   */
  async getAssignmentsByTenant(tenantId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      logDevError('assignmentService', 'Error fetching assignments by tenant:', error)
      throw error
    }

    return (data || []) as Assignment[]
  },

  /**
   * Verify assignment exists and optionally belongs to a tenant (SpeedGrader auth check).
   */
  async getAssignmentById(assignmentId: string, tenantId?: string): Promise<Assignment | null> {
    let query = supabase.from('assignments').select(ASSIGNMENT_COLUMNS).eq('id', assignmentId)
    if (tenantId) query = query.eq('tenant_id', tenantId)

    const { data, error } = await query.maybeSingle()

    if (error) {
      logDevError('assignmentService', 'Error fetching assignment by ID:', error)
      throw error
    }

    return data as Assignment | null
  },

  /**
   * Fetch a single submission's text (SpeedGrader inline view).
   */
  async getSubmissionText(
    assignmentId: string,
    studentId: string,
    tenantId?: string
  ): Promise<string | null> {
    let query = supabase
      .from('assignment_submissions')
      .select('submission_text')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
    if (tenantId) query = query.eq('tenant_id', tenantId)

    const { data, error } = await query.maybeSingle()

    if (error) {
      logDevError('assignmentService', 'Error fetching submission text:', error)
      return null
    }

    return data?.submission_text ?? null
  },

  /**
   * Internal method to fetch assignments with submissions.
   * Supports pagination for scalability with large datasets.
   */
  async getAssignments(tenantId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from('assignments')
      .select(
        `
                ${ASSIGNMENT_COLUMNS},
                assignment_submissions!left (
                    id,
                    status,
                    score,
                    submitted_at,
                    file_url,
                    user_profiles:student_id (
                        full_name
                    )
                )
            `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true })
      .range(from, to)

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
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assignment-submissions')
      .upload(storagePath, file, { upsert: false })
    if (uploadError) throw uploadError
    const { data: publicData } = supabase.storage
      .from('assignment-submissions')
      .getPublicUrl(uploadData?.path || '')
    return publicData?.publicUrl || uploadData?.path || ''
  },

  /**
   * Get count of pending (published, not yet submitted) assignments for a student.
   * Used by useNavBadges for the bottom nav badge.
   */
  async getPendingAssignmentCount(tenantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('assignments')
      .select(
        `id,
         assignment_submissions!left(id, status)`,
        { count: 'exact', head: false }
      )
      .eq('tenant_id', tenantId)
      .eq('is_published', true)
      .or(`assignment_submissions.student_id.is.null,assignment_submissions.status.neq.SUBMITTED`, {
        foreignTable: 'assignment_submissions',
      })

    if (error) {
      if (import.meta.env.DEV)
        console.error('[assignmentService] getPendingAssignmentCount error:', error)
      return 0
    }

    return count ?? 0
  },
}

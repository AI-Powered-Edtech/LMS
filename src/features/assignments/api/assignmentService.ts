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
      .upsert(
        { ...submission, status: 'submitted', submitted_at: new Date().toISOString() },
        { onConflict: 'assignment_id,student_id' }
      )
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
   * Only allows unsubmitting when status is 'submitted' — prevents reverting graded work.
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
      .eq('status', 'submitted')
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
   * FIXED: A2 — replaced hardcoded limit(200) with configurable limit parameter.
   */
  async getAssignmentSubmissions(assignmentId: string, tenantId: string, limit: number = 100) {
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
      .limit(limit)

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
   * FIXED: A2 — added pagination parameters to prevent unbounded query results.
   */
  async getAssignmentsByTenant(
    tenantId: string,
    page: number = 0,
    pageSize: number = 50
  ): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      logDevError('assignmentService', 'Error fetching assignments by tenant:', error)
      throw error
    }

    return (data || []) as Assignment[]
  },

  /**
   * Verify assignment exists and belongs to a tenant (SpeedGrader auth check).
   * tenantId is required to enforce tenant isolation.
   */
  async getAssignmentById(assignmentId: string, tenantId: string): Promise<Assignment | null> {
    const { data, error } = await supabase
      .from('assignments')
      .select(ASSIGNMENT_COLUMNS)
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      logDevError('assignmentService', 'Error fetching assignment by ID:', error)
      throw error
    }

    return data as Assignment | null
  },

  /**
   * Fetch a single submission's text (SpeedGrader inline view).
   * tenantId is required to prevent cross-tenant data leaks.
   */
  async getSubmissionText(
    assignmentId: string,
    studentId: string,
    tenantId: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('submission_text')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      logDevError('assignmentService', 'Error fetching submission text:', error)
      return null
    }

    return data?.submission_text ?? null
  },

  /**
   * Fetch submission ID dan teks sekaligus (SpeedGrader annotation support).
   * Mengembalikan { id, submission_text } atau null jika tidak ada submission.
   */
  async getSubmission(
    assignmentId: string,
    studentId: string,
    tenantId: string
  ): Promise<{ id: string; submission_text: string | null } | null> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('id, submission_text')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      logDevError('assignmentService', 'Error fetching submission:', error)
      return null
    }

    if (!data) return null

    return {
      id: data.id as string,
      submission_text: (data.submission_text as string | null) ?? null,
    }
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
   * Upload an assignment submission file to a PRIVATE storage bucket.
   * Returns the STORAGE PATH (not public URL) for security.
   * Use storageService.createSignedUrl() to access the file.
   * Validates MIME type and sanitizes filename before upload.
   */
  async uploadSubmissionFile(
    file: File,
    tenantId: string,
    assignmentId: string,
    userId: string
  ): Promise<string> {
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Tipe file "${file.type}" tidak didukung. Upload PDF, gambar, atau dokumen Word.`
      )
    }
    // Sanitize filename to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${tenantId}/assignments/${assignmentId}/${userId}/${Date.now()}-${safeName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assignment-submissions')
      .upload(storagePath, file, { upsert: false })
    if (uploadError) throw uploadError
    return uploadData?.path ?? storagePath
  },

  /**
   * Get count of pending (published, not yet submitted) assignments for a student.
   * Only counts assignments in courses the student is actively enrolled in.
   * Used by useNavBadges for the bottom nav badge.
   */
  async getPendingAssignmentCount(tenantId: string, userId: string): Promise<number> {
    // Step 1: Fetch the student's actively enrolled course IDs
    // NOTE: use course_enrollments (has course_id), NOT enrollments (has class_id, no course_id)
    const { data: enrollments, error: eErr } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE') // enrollment_status enum: uppercase only

    if (eErr) {
      if (import.meta.env.DEV)
        console.error('[assignmentService] getPendingAssignmentCount enrollments error:', eErr)
      return 0
    }

    if (!enrollments || enrollments.length === 0) return 0

    const enrolledCourseIds = enrollments.map((e) => e.course_id)

    // Step 2: Get all published assignments in the enrolled courses
    const { data: allAssignments, error: aErr } = await supabase
      .from('assignments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_published', true)
      .in('course_id', enrolledCourseIds)

    if (aErr) {
      if (import.meta.env.DEV)
        console.error('[assignmentService] getPendingAssignmentCount error:', aErr)
      return 0
    }

    if (!allAssignments || allAssignments.length === 0) return 0

    // Step 3: Get submitted assignment IDs for this student
    const { data: submitted, error: sErr } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('student_id', userId)
      .eq('status', 'submitted')
      .in(
        'assignment_id',
        allAssignments.map((a) => a.id)
      )

    if (sErr) {
      if (import.meta.env.DEV)
        console.error('[assignmentService] getPendingAssignmentCount submissions error:', sErr)
      return allAssignments.length
    }

    const submittedIds = new Set((submitted ?? []).map((s) => s.assignment_id))
    return allAssignments.filter((a) => !submittedIds.has(a.id)).length
  },
}
